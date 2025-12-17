#ifndef SERVOCONTROLLER_H
#define SERVOCONTROLLER_H

#include <Arduino.h>
#include <ESP32Servo.h>

class ServoController {
public:
    ServoController(int servoPin, int pinLed);
    void begin();
    bool AcctionnerBras(bool etatActuel);

    void performAction(const String& action) {
        if (action == "double_click") {
            AcctionnerBras(true);
            delay(200); // petit délai entre les mouvements
            AcctionnerBras(true);
        } else {
            // action simple (click)
            AcctionnerBras(true);
        }
    }

private:
    Servo myservo;
    int servoPin;
    int pinLed;
};

#endif
