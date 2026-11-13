/*
 * Smart Irrigation / Greenhouse Controller - ESP32 firmware
 * ---------------------------------------------------------------------------
 * Board : ESP32 ESP-32S 30P NodeMCU (Arduino core for ESP32 2.x or 3.x)
 * Talks to the greenhouse-server backend over HTTP(S):
 *   every N seconds  POST /api/v1/device/readings   (sensors + relay feedback)
 *   the response carries the commands (pump / grow light / buzzer) and the config.
 * All thresholds live on the server (dashboard Settings). If the server is unreachable
 * for OFFLINE_FALLBACK_MS the board keeps the greenhouse alive on its own with the
 * last thresholds it received.
 *
 * Libraries (Arduino Library Manager):
 *   - ArduinoJson            (Benoit Blanchon)  v7.x
 *   - DHT sensor library     (Adafruit) + Adafruit Unified Sensor
 *   - BH1750                 (Christopher Laws)        [only if USE_BH1750 = 1]
 *   - LiquidCrystal I2C      (Frank de Brabander)
 *
 * Wiring (see README for the full table):
 *   DHT22 data ........ GPIO 4   (10k pull-up to 3.3V if your module has none)
 *   Soil sensor AOUT .. GPIO 34  (capacitive v2.0, powered from 3.3V)
 *   LDR module AO ..... GPIO 35  (only when USE_BH1750 = 0)
 *   I2C SDA / SCL ..... GPIO 21 / GPIO 22  (BH1750 0x23 + LCD backpack 0x27)
 *   Relay IN1 (pump) .. GPIO 26
 *   Relay IN2 (light) . GPIO 27
 *   Buzzer ............ GPIO 25  (via NPN transistor for a 5V buzzer)
 *   Red status LED .... GPIO 13  (220 ohm resistor)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>

// ============================ USER SETTINGS ================================
const char* WIFI_SSID      = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
// Backend base URL, no trailing slash. LAN example: "http://192.168.0.10:5000"
const char* SERVER_URL     = "http://192.168.0.10:5000";
// API key printed by `npm run seed` (or POST /api/v1/devices)
const char* DEVICE_API_KEY = "ghk_PASTE_YOUR_DEVICE_KEY_HERE";

#define USE_BH1750        1      // 1 = BH1750 lux sensor on I2C, 0 = LDR module on GPIO 35
#define RELAY_ACTIVE_LOW  1      // most blue 2-channel relay boards switch ON with a LOW input
#define LCD_ADDRESS       0x27   // try 0x3F if the screen stays blank
#define LDR_LUX_FULL_SCALE 2000.0  // LDR only: rough lux when the LDR is fully lit (calibrate!)
// ===========================================================================

#define FW_VERSION "gh-esp32-1.0.0"

// ---- pins ----
#define PIN_DHT     4
#define PIN_SOIL    34
#define PIN_LDR     35
#define PIN_PUMP    26
#define PIN_LIGHT   27
#define PIN_BUZZER  25
#define PIN_LED     13

// ---- safety / timing ----
const uint32_t PUMP_HARD_LIMIT_MS   = 120000;  // the pump can never run longer than this, whatever happens
const uint32_t OFFLINE_FALLBACK_MS  = 120000;  // run local automation after 2 min without the server
const uint32_t HTTP_TIMEOUT_MS      = 8000;
const uint32_t LCD_PAGE_MS          = 3000;

DHT dht(PIN_DHT, DHT22);
LiquidCrystal_I2C lcd(LCD_ADDRESS, 16, 2);
#if USE_BH1750
#include <BH1750.h>
BH1750 lightMeter(0x23);
bool bh1750Ok = false;
#endif

// ---- config received from the server (defaults until the first response) ----
struct Config {
  uint32_t intervalSec   = 10;
  float soilDry          = 35;
  float soilWet          = 62;
  uint32_t pumpMaxRunSec = 30;
  uint32_t pumpSoakMin   = 10;
  float tempAlarm        = 32;
  float lightOn          = 1500;
  float lightHystPct     = 20;
  int soilRawDry         = 3100;
  int soilRawWet         = 1300;
} cfg;

// ---- live state ----
float tempC = NAN, humidity = NAN, lux = NAN;
int soilRaw = -1;
bool pumpOn = false, lightOn = false, buzzerOn = false;
uint32_t pumpStartedMs = 0, pumpDeadlineMs = 0, pumpLastOffMs = 0;
bool pumpLatchedOff = false;          // set after a local safety stop until the server says OFF
uint32_t lastServerOkMs = 0;
bool everReachedServer = false;
uint32_t lastPostMs = 0, lastLcdMs = 0;
uint8_t lcdPage = 0;

WiFiClient plainClient;
WiFiClientSecure tlsClient;

// ============================================================================
void setRelay(uint8_t pin, bool on) {
#if RELAY_ACTIVE_LOW
  digitalWrite(pin, on ? LOW : HIGH);
#else
  digitalWrite(pin, on ? HIGH : LOW);
#endif
}

void setPump(bool on, uint32_t maxRunSec) {
  if (on && !pumpOn) {
    uint32_t limit = min<uint32_t>((uint32_t)maxRunSec * 1000UL, PUMP_HARD_LIMIT_MS);
    pumpStartedMs = millis();
    pumpDeadlineMs = pumpStartedMs + limit;
  }
  if (!on && pumpOn) pumpLastOffMs = millis();
  pumpOn = on;
  setRelay(PIN_PUMP, on);
}

void setGrowLight(bool on) { lightOn = on; setRelay(PIN_LIGHT, on); }
void setBuzzer(bool on)    { buzzerOn = on; digitalWrite(PIN_BUZZER, on ? HIGH : LOW); }

float soilPercent(int raw) {
  if (raw < 0 || cfg.soilRawDry == cfg.soilRawWet) return NAN;
  float pct = (float)(cfg.soilRawDry - raw) / (float)(cfg.soilRawDry - cfg.soilRawWet) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
}

// ============================================================================
void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("WiFi: connecting to %s", WIFI_SSID);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) {
    delay(300);
    Serial.print('.');
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected, IP " + WiFi.localIP().toString() : " failed (will retry)");
}

void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  tempC = isnan(t) ? NAN : t;
  humidity = isnan(h) ? NAN : h;

  long sum = 0;
  for (int i = 0; i < 16; i++) { sum += analogRead(PIN_SOIL); delay(2); }
  soilRaw = sum / 16;

#if USE_BH1750
  if (bh1750Ok) {
    float l = lightMeter.readLightLevel();
    lux = (l < 0) ? NAN : l;
  } else lux = NAN;
#else
  // LDR modules give a higher voltage in the dark on most boards: invert, then scale. Approximate only.
  int raw = analogRead(PIN_LDR);
  lux = (4095 - raw) / 4095.0 * LDR_LUX_FULL_SCALE;
#endif
}

// ============================================================================
void applyConfig(JsonObject c) {
  if (c.isNull()) return;
  cfg.intervalSec   = c["reading_interval_sec"]   | cfg.intervalSec;
  cfg.soilDry       = c["soil_dry_threshold"]     | cfg.soilDry;
  cfg.soilWet       = c["soil_wet_target"]        | cfg.soilWet;
  cfg.pumpMaxRunSec = c["pump_max_run_sec"]       | cfg.pumpMaxRunSec;
  cfg.pumpSoakMin   = c["pump_min_interval_min"]  | cfg.pumpSoakMin;
  cfg.tempAlarm     = c["temp_alarm_threshold"]   | cfg.tempAlarm;
  cfg.lightOn       = c["light_on_threshold"]     | cfg.lightOn;
  cfg.lightHystPct  = c["light_hysteresis_pct"]   | cfg.lightHystPct;
  cfg.soilRawDry    = c["soil_raw_dry"]           | cfg.soilRawDry;
  cfg.soilRawWet    = c["soil_raw_wet"]           | cfg.soilRawWet;
  if (cfg.intervalSec < 2) cfg.intervalSec = 2;
}

void applyCommands(JsonObject cmd, uint32_t pumpRunSec) {
  bool wantPump = cmd["pump"] | false;
  if (!wantPump) pumpLatchedOff = false;               // server agrees it is off: clear the latch
  if (wantPump && pumpLatchedOff) wantPump = false;    // we already stopped it for safety
  setPump(wantPump, pumpRunSec > 0 ? pumpRunSec : cfg.pumpMaxRunSec);
  setGrowLight(cmd["grow_light"] | false);
  setBuzzer(cmd["buzzer"] | false);
}

bool httpBegin(HTTPClient& http, const String& url) {
  http.setTimeout(HTTP_TIMEOUT_MS);
  if (url.startsWith("https")) {
    tlsClient.setInsecure();  // encrypts traffic but skips certificate checks; pin a root CA for stricter security
    return http.begin(tlsClient, url);
  }
  return http.begin(plainClient, url);
}

bool postReading() {
  if (WiFi.status() != WL_CONNECTED) return false;

  JsonDocument doc;
  if (soilRaw >= 0) doc["soil_raw"] = soilRaw; else doc["soil_raw"] = nullptr;
  if (!isnan(tempC)) doc["temperature"] = round(tempC * 10) / 10.0; else doc["temperature"] = nullptr;
  if (!isnan(humidity)) doc["humidity"] = round(humidity * 10) / 10.0; else doc["humidity"] = nullptr;
  if (!isnan(lux)) doc["light_lux"] = round(lux); else doc["light_lux"] = nullptr;
  doc["pump"] = pumpOn;
  doc["grow_light"] = lightOn;
  doc["buzzer"] = buzzerOn;
  doc["rssi"] = WiFi.RSSI();
  doc["firmware"] = FW_VERSION;
  doc["uptime_s"] = millis() / 1000;
  JsonObject hw = doc["hw"].to<JsonObject>();
  hw["soil"] = "Capacitive v2.0 on GPIO 34";
  hw["temperature"] = "DHT22 on GPIO 4";
  hw["humidity"] = "DHT22 on GPIO 4";
#if USE_BH1750
  hw["light"] = "BH1750 on I\xC2\xB2" "C 0x23";
#else
  hw["light"] = "LDR module on GPIO 35";
#endif

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  if (!httpBegin(http, String(SERVER_URL) + "/api/v1/device/readings")) return false;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", DEVICE_API_KEY);
  int code = http.POST(body);
  if (code != 200) {
    Serial.printf("POST failed: HTTP %d %s\n", code, code > 0 ? http.getString().c_str() : http.errorToString(code).c_str());
    http.end();
    return false;
  }

  JsonDocument resp;
  DeserializationError err = deserializeJson(resp, http.getString());
  http.end();
  if (err) {
    Serial.printf("Bad JSON from server: %s\n", err.c_str());
    return false;
  }
  applyConfig(resp["config"].as<JsonObject>());
  applyCommands(resp["commands"].as<JsonObject>(), resp["pump_run_sec"] | 0);
  return true;
}

// Local automation used only while the server is unreachable (same rules, simplified)
void fallbackAutomation() {
  float soil = soilPercent(soilRaw);
  bool soaked = (millis() - pumpLastOffMs) > cfg.pumpSoakMin * 60000UL || pumpLastOffMs == 0;
  if (!pumpOn && !isnan(soil) && soil < cfg.soilDry && soaked && !pumpLatchedOff) setPump(true, cfg.pumpMaxRunSec);
  else if (pumpOn && (isnan(soil) || soil >= cfg.soilWet)) setPump(false, 0);

  if (!isnan(lux)) {
    if (!lightOn && lux < cfg.lightOn) setGrowLight(true);
    else if (lightOn && lux >= cfg.lightOn * (1 + cfg.lightHystPct / 100.0)) setGrowLight(false);
  }
  if (!isnan(tempC)) {
    if (tempC > cfg.tempAlarm) setBuzzer(true);
    else if (tempC <= cfg.tempAlarm - 1) setBuzzer(false);
  }
}

// ============================================================================
void lcdLine(uint8_t row, const char* text) {
  char buf[17];
  snprintf(buf, sizeof(buf), "%-16s", text);
  lcd.setCursor(0, row);
  lcd.print(buf);
}

void updateLcd(bool serverOk) {
  char a[24], b[24];
  if (lcdPage == 0) {
    if (isnan(tempC)) snprintf(a, sizeof(a), "T:--.- H:--%%");
    else snprintf(a, sizeof(a), "T:%.1fC H:%.0f%%", tempC, humidity);
    float s = soilPercent(soilRaw);
    if (isnan(lux)) snprintf(b, sizeof(b), "S:%.0f%% L:--", isnan(s) ? 0.0 : s);
    else if (lux >= 10000) snprintf(b, sizeof(b), "S:%.0f%% L:%.0fk", isnan(s) ? 0.0 : s, lux / 1000.0);
    else snprintf(b, sizeof(b), "S:%.0f%% L:%.0flx", isnan(s) ? 0.0 : s, lux);
  } else {
    snprintf(a, sizeof(a), "P:%s G:%s B:%s", pumpOn ? "ON" : "--", lightOn ? "ON" : "--", buzzerOn ? "ON" : "--");
    snprintf(b, sizeof(b), "%s %s", WiFi.status() == WL_CONNECTED ? "WiFi" : "NoWiFi", serverOk ? "Server OK" : "LOCAL MODE");
  }
  lcdLine(0, a);
  lcdLine(1, b);
}

// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\nGreenhouse controller " FW_VERSION);

  pinMode(PIN_PUMP, OUTPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  setPump(false, 0);
  setGrowLight(false);
  setBuzzer(false);
  pumpLastOffMs = 0;

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcdLine(0, "Greenhouse");
  lcdLine(1, "Starting...");

  dht.begin();
#if USE_BH1750
  bh1750Ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  if (!bh1750Ok) Serial.println("BH1750 not found - check I2C wiring (address 0x23)");
#endif

  connectWifi();
  lastServerOkMs = millis();
}

void loop() {
  uint32_t now = millis();

  // 1. hard pump safety, independent of everything else
  if (pumpOn && (int32_t)(now - pumpDeadlineMs) >= 0) {
    Serial.println("Pump safety stop (max run time)");
    setPump(false, 0);
    pumpLatchedOff = true;
  }

  // 2. reading cycle
  if (now - lastPostMs >= cfg.intervalSec * 1000UL || lastPostMs == 0) {
    lastPostMs = now;
    connectWifi();
    readSensors();
    if (postReading()) {
      lastServerOkMs = millis();
      everReachedServer = true;
    } else if (millis() - lastServerOkMs > OFFLINE_FALLBACK_MS) {
      fallbackAutomation();
    }
    Serial.printf("soil_raw=%d (%.0f%%) T=%.1f H=%.0f L=%.0f | pump=%d light=%d buzzer=%d\n",
                  soilRaw, soilPercent(soilRaw), tempC, humidity, lux, pumpOn, lightOn, buzzerOn);
  }

  bool serverOk = everReachedServer && (millis() - lastServerOkMs) <= OFFLINE_FALLBACK_MS;

  // 3. status LED: solid = alarm, slow blink = local mode / no server, off = all good
  if (buzzerOn) digitalWrite(PIN_LED, HIGH);
  else if (!serverOk) digitalWrite(PIN_LED, (now / 500) % 2);
  else digitalWrite(PIN_LED, LOW);

  // 4. LCD pages
  if (now - lastLcdMs >= LCD_PAGE_MS) {
    lastLcdMs = now;
    lcdPage = (lcdPage + 1) % 2;
    updateLcd(serverOk);
  }

  delay(20);
}
