#ifndef PHOTO_CONTROLLER_H
#define PHOTO_CONTROLLER_H

#include <Arduino.h>
#include "ServoController.h"

class PhotoController {
public:
    PhotoController(int analogPin,
                    int seuil,
                    const String& op,
                    ServoController& servo);

    void begin();
    void updateConfig(int seuil, const String& op);
    bool update(bool& Fenetre_ouverte);

private:
    bool compare(int value, int seuil, const String& op);

    int pin;
    int luminosite_seuil;
    String luminosite_op;

    bool actionActive;
    bool alreadyTriggered;

    ServoController& servoCtrl;
};

#endif
