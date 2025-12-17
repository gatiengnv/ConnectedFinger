#include "ServoController.h"

ServoController::ServoController(int servoPin, int pinLed)
    : servoPin(servoPin), pinLed(pinLed) {}

void ServoController::begin() {
    pinMode(pinLed, OUTPUT);
    myservo.attach(servoPin);
    myservo.write(0);
}

bool ServoController::AcctionnerBras(bool etatActuel) {
    Serial.println("Activation du Finger Konnect");
    digitalWrite(pinLed, HIGH);
    myservo.write(180);
    delay(800);
    digitalWrite(pinLed, LOW);
    myservo.write(0);
    delay(800);
    return !etatActuel;
}
