#ifndef EVENT_H
#define EVENT_H

#include <Arduino.h>
#include <time.h>

struct EventCondition {
    bool hasDate = false;
    String date;

    bool hasHour = false;
    String hour;

    String repeat = "always";
};

bool isScheduleValid(const EventCondition &cond, tm &now) {

    // AUCUNE CONTRAINTE TEMPORELLE → TOUJOURS VALIDE
    if (!cond.hasDate && !cond.hasHour && cond.repeat == "always") {
        return true;
    }

    // Vérification date
    if (cond.hasDate) {
        char today[11];
        strftime(today, sizeof(today), "%d/%m/%Y", &now);
        if (cond.date != String(today)) return false;
    }

    // Vérification heure
    if (cond.hasHour) {
        char currentHour[6];
        strftime(currentHour, sizeof(currentHour), "%H:%M", &now);
        if (cond.hour != String(currentHour)) return false;
    }

    return true;
}


#endif
