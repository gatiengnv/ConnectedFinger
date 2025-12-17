#ifndef DHTCONTROLLER_H
#define DHTCONTROLLER_H

#include <Arduino.h>
#include "DHT.h"
#include "ServoController.h"

class DHTController {
public:
    DHTController(int pin, int type,
                  int humiditeSeuil, int tempSeuil,
                  const String& humidOp, const String& tempOp,
                  ServoController& servo);

    void begin();
    bool update(bool& Fenetre_ouverte);
    void updateConfig(int humidSeuil, int tempSeuil,
                      const String& humidOp, const String& tempOp);

private:
    bool compare(float value, float seuil, const String& op);

    DHT dht;
    ServoController& servoCtrl;

    int humidite_seuil;
    int temp_seuil;

    String humidite_op;
    String temperature_op;

    bool alreadyTriggered;
    bool actionActive;
};

#endif
