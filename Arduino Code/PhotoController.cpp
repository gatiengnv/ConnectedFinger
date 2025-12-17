#include "PhotoController.h"

PhotoController::PhotoController(int analogPin,
                                 int seuil,
                                 const String& op,
                                 ServoController& servo)
    : pin(analogPin),
      luminosite_seuil(seuil),
      luminosite_op(op),
      actionActive(false),
      alreadyTriggered(false),
      servoCtrl(servo) {}

void PhotoController::begin() {
    pinMode(pin, INPUT);
}

void PhotoController::updateConfig(int seuil, const String& op) {
    luminosite_seuil = seuil;
    luminosite_op = op;
    actionActive = (seuil >= 0);
}

bool PhotoController::compare(int value, int seuil, const String& op) {
    if (op == ">") return value > seuil;
    if (op == "<") return value < seuil;
    if (op == "=") return value == seuil;
    return value >= seuil;
}

bool PhotoController::update(bool& Fenetre_ouverte) {
    if (!actionActive) return false;

    int lum = analogRead(pin);
    bool conditionOK = compare(lum, luminosite_seuil, luminosite_op);

    if (conditionOK && !alreadyTriggered) {
        alreadyTriggered = true;
        return true;
    }

    if (!conditionOK) alreadyTriggered = false;
    return false;
}
