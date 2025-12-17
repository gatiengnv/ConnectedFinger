#include "DHTController.h"

DHTController::DHTController(int pin, int type,
                             int humiditeSeuil, int tempSeuil,
                             const String& humidOp, const String& tempOp,
                             ServoController& servo)
    : dht(pin, type),
      servoCtrl(servo),
      humidite_seuil(humiditeSeuil),
      temp_seuil(tempSeuil),
      humidite_op(humidOp),
      temperature_op(tempOp),
      alreadyTriggered(false),
      actionActive(false) {}

void DHTController::begin() {
    dht.begin();
}

bool DHTController::compare(float value, float seuil, const String& op) {
    if (op == ">") return value > seuil;
    if (op == "<") return value < seuil;
    if (op == "=") return value == seuil;
    return value >= seuil;
}

bool DHTController::update(bool& Fenetre_ouverte) {
    if (!actionActive) return false;

    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) return false;

    bool trigger =
        (humidite_seuil >= 0 && compare(h, humidite_seuil, humidite_op)) ||
        (temp_seuil >= 0 && compare(t, temp_seuil, temperature_op));

    if (trigger && !alreadyTriggered) {
        alreadyTriggered = true;
        return true;
    }

    if (!trigger) alreadyTriggered = false;
    return false;
}

void DHTController::updateConfig(int humidSeuil, int tempSeuil,
                                 const String& humidOp, const String& tempOp) {
    humidite_seuil = humidSeuil;
    temp_seuil = tempSeuil;
    humidite_op = humidOp;
    temperature_op = tempOp;
    actionActive = (humidSeuil >= 0 || tempSeuil >= 0);
}
