/*
 * Smart Irrigation / Greenhouse Controller - ESP32 firmware
 * ---------------------------------------------------------------------------
 * Board : ESP32 ESP-32S 30P NodeMCU (+ 30P expansion board)   Arduino core for ESP32 2.x or 3.x
 *
 * Talks to the greenhouse-server backend over Wi-Fi (HTTP or HTTPS):
 *   every N seconds  POST /api/v1/device/readings   (sensors + actual relay states)
 *   the response carries the commands (pump / grow light / buzzer) and the current thresholds.
 * All thresholds live on the server (dashboard Settings / Automation). If the server is unreachable
 * for OFFLINE_FALLBACK_MS the board keeps the plants safe on its own with the last thresholds it received.
 *
 * Libraries (Arduino IDE > Library Manager):
 *   - ArduinoJson            (Benoit Blanchon)  v7.x
 *   - DHT sensor library     (Adafruit)  + "Adafruit Unified Sensor"
 *   - LiquidCrystal I2C      (Frank de Brabander)
 *   - BH1750                 (Christopher Laws)   only if you add a BH1750 and set USE_BH1750 1
 *
 * Wiring for the parts list (see greenhouse-server/README.md for the full table):
 *   DHT22 module DATA ........ GPIO 4      VCC 3V3, GND
 *   Capacitive soil AOUT ..... GPIO 34     VCC 3V3, GND
 *   LDR module (4-pin) AO .... GPIO 35     VCC 3V3, GND  (DO not used)
 *   LCD I2C adapter SDA/SCL .. GPIO 21 / GPIO 22   VCC 5V (VIN), GND
 *   Relay IN1 (pump) ......... GPIO 26     relay VCC 5V (VIN), GND
 *   Relay IN2 (grow light) ... GPIO 27
 *   Active buzzer + .......... GPIO 25     buzzer - to GND
 *   Red LED anode ............ GPIO 13 through a 220 ohm resistor, cathode to GND
 *   Pump: 2xAA + -> relay 1 COM, relay 1 NO -> pump +, pump - -> 2xAA -
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
// Backend base URL, no trailing slash. The PC running `npm run dev` on the SAME Wi-Fi, e.g. "http://192.168.0.10:5000"
// (find it with `ipconfig` on Windows -> IPv4 Address). Never "localhost": that would be the ESP32 itself.
const char* SERVER_URL     = "http://192.168.0.10:5000";
// API key printed by `npm run seed` (or Settings > Device API key > New key)
const char* DEVICE_API_KEY = "ghk_PASTE_YOUR_DEVICE_KEY_HERE";

#define USE_BH1750         0      // 0 = LDR module on GPIO 35 (parts list), 1 = BH1750 lux sensor on I2C
#define RELAY_ACTIVE_LOW   1      // most blue 2-channel relay boards switch ON with a LOW input; set 0 if inverted
#define LCD_ADDRESS        0x27   // try 0x3F if the screen stays blank
#define BUZZER_BEEP        1      // 1 = intermittent beep while the alarm is on, 0 = continuous tone

// LDR module calibration (only USE_BH1750 0). The LDR gives an *estimate* of lux:
#define LDR_BRIGHT_IS_LOW  1      // most LDR modules: AO voltage falls in bright light. Set 0 if yours rises.
#define LDR_FIXED_OHMS     10000.0  // the module's fixed resistor (10k on almost all boards)
#define LDR_R10_OHMS       15000.0  // LDR resistance at 10 lux (GL5528 ~ 10-20k). Raise it if lux reads too high.
#define LDR_GAMMA          0.7      // LDR slope (GL55xx ~ 0.6-0.8)
// ===========================================================================

#define FW_VERSION "gh-esp32-1.1.0"

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
const uint32_t HTTP_TIMEOUT_MS      = 5000;
const uint32_t WIFI_RETRY_MS        = 10000;
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
int soilRaw = -1, ldrRaw = -1;
bool pumpOn = false, lightOn = false, buzzerOn = false;
uint32_t pumpStartedMs = 0, pumpDeadlineMs = 0, pumpLastOffMs = 0;
bool pumpLatchedOff = false;          // set after a local safety stop until the server says OFF
uint32_t lastServerOkMs = 0;
bool everReachedServer = false;
uint32_t lastPostMs = 0, lastLcdMs = 0, lastWifiAttemptMs = 0;
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
    Serial.printf("Pump ON (max %lus)\n", (unsigned long)(limit / 1000));
  }
  if (!on && pumpOn) {
    pumpLastOffMs = millis();
    Serial.println("Pump OFF");
  }
  pumpOn = on;
  setRelay(PIN_PUMP, on);
}

void setGrowLight(bool on) { lightOn = on; setRelay(PIN_LIGHT, on); }
void setBuzzer(bool on)    { buzzerOn = on; if (!on) digitalWrite(PIN_BUZZER, LOW); }

// Pump hard limit: checked in the loop and around every blocking call.
void pumpSafetyCheck() {
  if (pumpOn && (int32_t)(millis() - pumpDeadlineMs) >= 0) {
    Serial.println("Pump safety stop (max run time)");
    setPump(false, 0);
    pumpLatchedOff = true;
  }
}

float soilPercent(int raw) {
  if (raw < 0 || cfg.soilRawDry == cfg.soilRawWet) return NAN;
  float pct = (float)(cfg.soilRawDry - raw) / (float)(cfg.soilRawDry - cfg.soilRawWet) * 100.0f;
  return constrain(pct, 0.0f, 100.0f);
}

#if !USE_BH1750
// Photoresistor -> approximate lux. Module = LDR + fixed resistor voltage divider.
// R_ldr from the divider, then lux = 10 * (R10 / R_ldr)^(1/gamma).
float ldrToLux(int raw) {
  float v = constrain(raw / 4095.0f, 0.002f, 0.998f);   // fraction of supply voltage
#if LDR_BRIGHT_IS_LOW
  float rLdr = LDR_FIXED_OHMS * v / (1.0f - v);          // LDR between AO and GND
#else
  float rLdr = LDR_FIXED_OHMS * (1.0f - v) / v;          // LDR between VCC and AO
#endif
  float l = 10.0f * powf(LDR_R10_OHMS / rLdr, 1.0f / LDR_GAMMA);
  return constrain(l, 0.0f, 100000.0f);
}
#endif

// ============================================================================
// Wi-Fi: never blocks the loop for long, so pump safety keeps running while the network is down.
void startWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setHostname("greenhouse-esp32");
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttemptMs = millis();
  Serial.printf("WiFi: connecting to %s", WIFI_SSID);
  // At boot (pump is off) wait up to 15 s so the first reading goes out straight away
  while (WiFi.status() != WL_CONNECTED && millis() - lastWifiAttemptMs < 15000) {
    delay(300);
    Serial.print('.');
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
  }
  if (WiFi.status() == WL_CONNECTED) Serial.printf(" connected, IP %s, RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  else Serial.println(" not yet (will keep retrying in the background)");
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiAttemptMs < WIFI_RETRY_MS) return;
  lastWifiAttemptMs = millis();
  Serial.println("WiFi: reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
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
  sum = 0;
  for (int i = 0; i < 8; i++) { sum += analogRead(PIN_LDR); delay(2); }
  ldrRaw = sum / 8;
  lux = ldrToLux(ldrRaw);
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
  if (cfg.intervalSec < 2) cfg.intervalSec = 2;    // the DHT22 cannot be read faster
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
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
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
  pumpSafetyCheck();
  if (code != 200) {
    if (code == 401) Serial.println("POST rejected: wrong DEVICE_API_KEY (HTTP 401)");
    else Serial.printf("POST failed: HTTP %d %s\n", code, code > 0 ? http.getString().c_str() : http.errorToString(code).c_str());
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

// Local automation, used only while the server is unreachable (same rules, simplified)
void fallbackAutomation() {
  float soil = soilPercent(soilRaw);
  bool soaked = pumpLastOffMs == 0 || (millis() - pumpLastOffMs) > cfg.pumpSoakMin * 60000UL;
  if (pumpLatchedOff && soaked) pumpLatchedOff = false;   // no server to clear it: allow the next pulse after the soak time
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
  analogSetAttenuation(ADC_11db);   // 0-3.3 V range on GPIO 34/35

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

  startWifi();
  lastServerOkMs = millis();
}

void loop() {
  uint32_t now = millis();

  // 1. hard pump safety, independent of everything else
  pumpSafetyCheck();

  // 2. keep Wi-Fi up without blocking
  ensureWifi();

  // 3. reading cycle
  if (now - lastPostMs >= cfg.intervalSec * 1000UL || lastPostMs == 0) {
    lastPostMs = now;
    readSensors();
    if (postReading()) {
      lastServerOkMs = millis();
      if (!everReachedServer) Serial.println("Connected to the greenhouse server - dashboard is live");
      everReachedServer = true;
    } else if (millis() - lastServerOkMs > OFFLINE_FALLBACK_MS) {
      fallbackAutomation();
    }
#if USE_BH1750
    Serial.printf("soil_raw=%d (%.0f%%) T=%.1f H=%.0f L=%.0f | pump=%d light=%d buzzer=%d\n",
                  soilRaw, soilPercent(soilRaw), tempC, humidity, lux, pumpOn, lightOn, buzzerOn);
#else
    Serial.printf("soil_raw=%d (%.0f%%) T=%.1f H=%.0f ldr_raw=%d L~%.0f | pump=%d light=%d buzzer=%d\n",
                  soilRaw, soilPercent(soilRaw), tempC, humidity, ldrRaw, lux, pumpOn, lightOn, buzzerOn);
#endif
  }

  bool serverOk = everReachedServer && (millis() - lastServerOkMs) <= OFFLINE_FALLBACK_MS;

  // 4. buzzer output (beep pattern while the alarm is on)
#if BUZZER_BEEP
  digitalWrite(PIN_BUZZER, buzzerOn && ((now / 400) % 2 == 0) ? HIGH : LOW);
#else
  digitalWrite(PIN_BUZZER, buzzerOn ? HIGH : LOW);
#endif

  // 5. status LED: solid = alarm, slow blink = local mode / no server, off = all good
  if (buzzerOn) digitalWrite(PIN_LED, HIGH);
  else if (!serverOk) digitalWrite(PIN_LED, (now / 500) % 2);
  else digitalWrite(PIN_LED, LOW);

  // 6. LCD pages
  if (now - lastLcdMs >= LCD_PAGE_MS) {
    lastLcdMs = now;
    lcdPage = (lcdPage + 1) % 2;
    updateLcd(serverOk);
  }

  delay(20);
}
