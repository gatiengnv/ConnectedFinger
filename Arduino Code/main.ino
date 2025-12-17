#include <WiFi.h>
#include <WebServer.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include <time.h>

#include "Event.h"
#include "ServoController.h"
#include "DHTController.h"
#include "PhotoController.h"

// ================= CONFIG =================
#define DHTPIN     23
#define DHTTYPE    DHT22
#define SERVO_PIN  18
#define LED_PIN    19
#define PHOTO_PIN  34

const char* AP_SSID = "FingerKonnect";
const char* AP_PASS = "12345678";

const char* STA_SSID = "S25 de dradog";
const char* STA_PASS = "esp32viens_a_moi";

// ================= GLOBAL =================
WebServer server(80);

int LUMINOSITE_SEUIL = -1;
String LUMINOSITE_OP = ">=";

int HUMIDITE_SEUIL = -1;
int TEMP_SEUIL     = -1;
String HUM_OP  = ">=";
String TEMP_OP = ">=";

bool Fenetre_ouverte = false;

// Dernier événement chargé
EventCondition currentEventCond;
String currentEventName = "";
String currentEventAction = "click";

bool oneTimeExecuted = false;

// Contrôleurs
ServoController servoCtrl(SERVO_PIN, LED_PIN);
DHTController dhtCtrl(
    DHTPIN, DHTTYPE,
    HUMIDITE_SEUIL, TEMP_SEUIL,
    HUM_OP, TEMP_OP,
    servoCtrl
);
PhotoController photoCtrl(
    PHOTO_PIN,
    LUMINOSITE_SEUIL,
    LUMINOSITE_OP,
    servoCtrl
);

// ================= PROTOTYPES =================
void startWiFiAP();
void connectWiFiSTA();
void handlePostEvents();
void handleGetEvents();
bool getCurrentTime(tm &now);
bool isScheduleValid(const EventCondition &cond, const tm &now);

// ================= SETUP =================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n================ BOOT =================");

    SPIFFS.begin(true);

    startWiFiAP();
    connectWiFiSTA();

    // ===== NTP =====
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println(" Synchronisation de l'heure...");
        configTime(3600, 0, "pool.ntp.org", "time.nist.gov"); // UTC+1

        tm now;
        int retries = 0;
        while(!getLocalTime(&now) && retries < 10){
            delay(1000);
            Serial.print(".");
            retries++;
        }

        if(retries == 10){
            Serial.println("\n⚠ Heure non disponible (schedule ignoré)");
        } else {
            Serial.print("\n Heure : ");
            Serial.println(&now, "%d/%m/%Y %H:%M:%S");
        }
    }

    // ===== Serveur HTTP =====
    server.on("/events", HTTP_POST, handlePostEvents);
    server.on("/events", HTTP_GET, handleGetEvents);
    server.begin();
    Serial.println(" Serveur HTTP démarré");

    // ===== Initialisation capteurs =====
    servoCtrl.begin();
    dhtCtrl.begin();
    photoCtrl.begin();

    Serial.println(" Système prêt");
    Serial.println("=======================================\n");
}

// ================= LOOP =================
void loop() {
    server.handleClient();

    static unsigned long last = 0;
    if (millis() - last > 3000) {
        bool dhtEvent   = dhtCtrl.update(Fenetre_ouverte);
        bool photoEvent = photoCtrl.update(Fenetre_ouverte);

        bool eventON = dhtEvent || photoEvent;

        if (currentEventCond.repeat == "one_time" && oneTimeExecuted) {
            eventON = false;
        }

        if (eventON) {
            Serial.println("🟢 ÉVÉNEMENT DÉTECTÉ");

            tm now;
            if (!getCurrentTime(now)) {
                Serial.print("Heure indisponible → action autorisée par: ");
            } else if (isScheduleValid(currentEventCond, now)) {
                Serial.print("✅ Action autorisée par le schedule de: ");
            } else {
                Serial.println("⛔ Action BLOQUÉE (hors horaire)");
                last = millis();
                return;
            }

            Serial.println(currentEventName);

            if (dhtEvent)   servoCtrl.performAction(currentEventAction);
            if (photoEvent) servoCtrl.performAction(currentEventAction);

            if (currentEventCond.repeat == "one_time") {
                oneTimeExecuted = true;
            }
        }

        last = millis();
    }
}

// ================= TIME =================
bool getCurrentTime(tm &now) {
    return getLocalTime(&now);
}

// ================= WIFI =================
void startWiFiAP() {
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.print("AP actif | IP : ");
    Serial.println(WiFi.softAPIP());
}

void connectWiFiSTA() {
    WiFi.begin(STA_SSID, STA_PASS);
    Serial.print("Connexion au Wi-Fi ");
    int retries = 0;
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
        delay(500);
        Serial.print(".");
        retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n Connecté au Wi-Fi");
        Serial.print(" IP locale : ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n Impossible de se connecter au Wi-Fi, NTP non disponible");
    }
}

// ================= POST /events =================
void handlePostEvents() {
    if (!server.hasArg("plain")) {
        server.send(400, "text/plain", "Body manquant");
        return;
    }

    DynamicJsonDocument doc(4096);
    if (deserializeJson(doc, server.arg("plain"))) {
        server.send(400, "text/plain", "JSON invalide");
        return;
    }

    File f = SPIFFS.open("/events.json", "w");
    serializeJson(doc, f);
    f.close();

    JsonArray events = doc["events"];

    if (events.size() == 0) {
        currentEventName = "";
        Serial.println(" Aucun événement détecté");
        server.send(200, "text/plain", "OK");
        return;
    }

    for (JsonObject ev : events) {
        JsonObject cond = ev["condition"];

        currentEventName = ev.containsKey("name") ? String(ev["name"]) : "Événement sans nom";
        currentEventAction = ev.containsKey("action") ? String(ev["action"]) : "click";

        Serial.printf("📥 Événement chargé : %s | Action : %s\n",
                      currentEventName.c_str(), currentEventAction.c_str());

        // ===== CAPTEURS =====
        bool humidActive = false;
        bool tempActive = false;
        bool luminosActive = false;

        if (cond.containsKey("humidity")) {
            HUMIDITE_SEUIL = cond["humidity"];
            HUM_OP = cond.containsKey("humidityOperator") ? String(cond["humidityOperator"]) : ">=";
            humidActive = (HUMIDITE_SEUIL >= 0);
            Serial.printf("💧 Humidité seuil: %d %s\n", HUMIDITE_SEUIL, HUM_OP.c_str());
        } else HUMIDITE_SEUIL = -1;

        if (cond.containsKey("temperature")) {
            TEMP_SEUIL = cond["temperature"];
            TEMP_OP = cond.containsKey("temperatureOperator") ? String(cond["temperatureOperator"]) : ">=";
            tempActive = (TEMP_SEUIL >= 0);
            Serial.printf("🌡 Température seuil: %d %s\n", TEMP_SEUIL, TEMP_OP.c_str());
        } else TEMP_SEUIL = -1;

        dhtCtrl.updateConfig(HUMIDITE_SEUIL, TEMP_SEUIL, HUM_OP, TEMP_OP);

        if (cond.containsKey("luminosity")) {
            LUMINOSITE_SEUIL = cond["luminosity"];
            LUMINOSITE_OP = cond.containsKey("luminosityOperator") ? String(cond["luminosityOperator"]) : ">=";
            luminosActive = (LUMINOSITE_SEUIL >= 0);
            Serial.printf("💡 Luminosité seuil: %d %s\n", LUMINOSITE_SEUIL, LUMINOSITE_OP.c_str());
            photoCtrl.updateConfig(LUMINOSITE_SEUIL, LUMINOSITE_OP);
        } else LUMINOSITE_SEUIL = -1;

        // ===== SCHEDULE =====
        currentEventCond = EventCondition();
        currentEventCond.hasHour = cond.containsKey("hour");
        if (currentEventCond.hasHour)
            currentEventCond.hour = String(cond["hour"]);

        currentEventCond.hasDate = cond.containsKey("date");
        if (currentEventCond.hasDate)
            currentEventCond.date = String(cond["date"]);

        currentEventCond.repeat =
            ev.containsKey("repeat") ? String(ev["repeat"]) : "always";
        Serial.print("🔁 Type de répétition : ");
        Serial.println(currentEventCond.repeat);

        oneTimeExecuted = false; // reset si nouvel event chargé

        // Affichage état ON/OFF par capteur
        Serial.print(" Événement actif sur : ");
        if (!humidActive && !tempActive && !luminosActive) {
            Serial.println(" Aucun capteur (événement sans seuils)");
        } else {
            if (humidActive) Serial.print("💧 Humidité ");
            if (tempActive) Serial.print("🌡 Température ");
            if (luminosActive) Serial.print("💡 Luminosité ");
            Serial.println();
        }

        Serial.println(" Configuration appliquée\n");
    }

    server.send(200, "text/plain", "OK");
}

// ================= GET /events =================
void handleGetEvents() {
    if (!SPIFFS.exists("/events.json")) {
        server.send(404, "text/plain", "Aucun event");
        return;
    }

    File f = SPIFFS.open("/events.json", "r");
    server.send(200, "application/json", f.readString());
    f.close();
}
