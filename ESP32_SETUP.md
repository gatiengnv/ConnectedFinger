# Configuration ESP32 pour recevoir les données JSON

## Vue d'ensemble

Cette application React Native envoie les événements sous forme de JSON à votre ESP32 via HTTP. L'ESP32 agit comme **point d'accès WiFi** (Access Point), ce qui vous permet de vous connecter directement à lui sans avoir besoin d'un routeur WiFi.

## Format des données JSON envoyées

```json
{
  "events": [
    {
      "action": "click",
      "condition": {
        "humidity": 50,
        "temperature": 25,
        "luminosity": 70,
        "date": "25/12/2024",
        "hour": "14:30"
      },
      "repeat": "always"
    }
  ]
}
```

## Code Arduino/ESP32 (exemple)

### 1. Bibliothèques nécessaires

Installez ces bibliothèques via l'IDE Arduino :
- **WiFi.h** (inclus par défaut)
- **WebServer.h** (inclus par défaut)
- **ArduinoJson** (installer via le gestionnaire de bibliothèques)

### 2. Code exemple pour l'ESP32 en mode Access Point

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

// Configuration du point d'accès WiFi
const char* ap_ssid = "ESP32-ConnectedFinger";
const char* ap_password = "12345678";  // Minimum 8 caractères
const IPAddress ap_ip(192, 168, 4, 1);       // IP de l'ESP32
const IPAddress ap_gateway(192, 168, 4, 1);
const IPAddress ap_subnet(255, 255, 255, 0);

// Créer le serveur web sur le port 80
WebServer server(80);

void setup() {
  Serial.begin(115200);
  
  // Initialiser SPIFFS pour sauvegarder le JSON
  if (!SPIFFS.begin(true)) {
    Serial.println("Erreur lors du montage de SPIFFS");
    return;
  }
  
  // Configurer l'ESP32 en mode Access Point
  Serial.println("Configuration du mode Access Point...");
  WiFi.softAPConfig(ap_ip, ap_gateway, ap_subnet);
  WiFi.softAP(ap_ssid, ap_password);
  
  Serial.println("");
  Serial.println("Point d'accès WiFi créé!");
  Serial.print("SSID: ");
  Serial.println(ap_ssid);
  Serial.print("Mot de passe: ");
  Serial.println(ap_password);
  Serial.print("Adresse IP: ");
  Serial.println(WiFi.softAPIP());  // Affiche l'IP (normalement 192.168.4.1)
  
  // Configurer les routes du serveur
  server.on("/events", HTTP_POST, handlePostEvents);
  server.on("/events", HTTP_GET, handleGetEvents);
  server.on("/", HTTP_GET, handleRoot);
  
  // Démarrer le serveur
  server.begin();
  Serial.println("Serveur HTTP démarré");
  Serial.println("Connectez votre téléphone au WiFi 'ESP32-ConnectedFinger'");
  Serial.println("Puis utilisez l'IP: 192.168.4.1 dans l'application");
}

void loop() {
  server.handleClient();
}

// Page d'accueil pour vérifier que le serveur fonctionne
void handleRoot() {
  String html = "<html><body>";
  html += "<h1>ESP32 ConnectedFinger</h1>";
  html += "<p>Serveur actif et prêt à recevoir des événements.</p>";
  html += "<p>Nombre de clients connectés: " + String(WiFi.softAPgetStationNum()) + "</p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

// Gestion de la réception des événements (POST)
void handlePostEvents() {
  if (server.hasArg("plain") == false) {
    server.send(400, "text/plain", "Body manquant");
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("Données reçues:");
  Serial.println(body);
  
  // Parser le JSON
  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    Serial.print("Erreur de parsing JSON: ");
    Serial.println(error.c_str());
    server.send(400, "text/plain", "JSON invalide");
    return;
  }
  
  // Sauvegarder dans SPIFFS
  File file = SPIFFS.open("/events.json", "w");
  if (!file) {
    Serial.println("Erreur d'ouverture du fichier");
    server.send(500, "text/plain", "Erreur d'écriture");
    return;
  }
  
  serializeJson(doc, file);
  file.close();
  
  // Traiter les événements
  JsonArray events = doc["events"];
  Serial.printf("Nombre d'événements reçus: %d\n", events.size());
  
  for (JsonObject event : events) {
    String action = event["action"];
    String repeat = event["repeat"];
    
    Serial.println("---");
    Serial.print("Action: ");
    Serial.println(action);
    Serial.print("Repeat: ");
    Serial.println(repeat);
    
    if (event["condition"]["humidity"]) {
      float humidity = event["condition"]["humidity"];
      Serial.print("Humidity: ");
      Serial.println(humidity);
    }
    
    if (event["condition"]["temperature"]) {
      float temperature = event["condition"]["temperature"];
      Serial.print("Temperature: ");
      Serial.println(temperature);
    }
    
    if (event["condition"]["luminosity"]) {
      float luminosity = event["condition"]["luminosity"];
      Serial.print("Luminosity: ");
      Serial.println(luminosity);
    }
    
    if (event["condition"]["date"]) {
      const char* date = event["condition"]["date"];
      Serial.print("Date: ");
      Serial.println(date);
    }
    
    if (event["condition"]["hour"]) {
      const char* hour = event["condition"]["hour"];
      Serial.print("Hour: ");
      Serial.println(hour);
    }
  }
  
  server.send(200, "text/plain", "Événements reçus avec succès");
}

// Récupération des événements sauvegardés (GET)
void handleGetEvents() {
  File file = SPIFFS.open("/events.json", "r");
  if (!file) {
    server.send(404, "text/plain", "Aucun événement sauvegardé");
    return;
  }
  
  String content = file.readString();
  file.close();
  
  server.send(200, "application/json", content);
}
```

## Instructions d'utilisation

### 1. Configuration de l'ESP32

1. **Téléversez le code** sur votre ESP32
2. **Ouvrez le moniteur série** (115200 bauds)
3. Vous verrez s'afficher :
   ```
   Point d'accès WiFi créé!
   SSID: ESP32-ConnectedFinger
   Mot de passe: 12345678
   Adresse IP: 192.168.4.1
   Serveur HTTP démarré
   ```

### 2. Connexion depuis votre téléphone

1. **Ouvrez les paramètres WiFi** de votre téléphone
2. **Connectez-vous au réseau** : `ESP32-ConnectedFinger`
3. **Entrez le mot de passe** : `12345678`
4. Votre téléphone est maintenant connecté directement à l'ESP32 !

### 3. Configuration de l'application mobile

1. **Lancez l'application** React Native
2. **Entrez l'adresse IP** : `192.168.4.1`
3. **Créez vos événements**
4. **Appuyez sur "Sync to ESP32"**

### 4. Vérification

Dans le moniteur série de l'ESP32, vous devriez voir :
```
Données reçues:
{"events":[...]}
Nombre d'événements reçus: 1
---
Action: click
Repeat: always
Humidity: 50
```

## Configuration personnalisée

Vous pouvez modifier dans le code :

- **Le nom du réseau WiFi** : Changez `"ESP32-ConnectedFinger"` par ce que vous voulez
- **Le mot de passe** : Changez `"12345678"` (minimum 8 caractères)
- **L'adresse IP** : Par défaut `192.168.4.1` (recommandé de garder cette valeur)

## Dépannage

### L'application ne peut pas se connecter

- ✅ Vérifiez que vous êtes bien connecté au WiFi `ESP32-ConnectedFinger`
- ✅ Vérifiez que l'adresse IP dans l'application est `192.168.4.1`
- ✅ Testez avec un navigateur : `http://192.168.4.1` (vous devriez voir une page d'accueil)
- ✅ Vérifiez que l'ESP32 est allumé (le moniteur série doit afficher des messages)

### Le téléphone ne trouve pas le réseau WiFi

- Redémarrez l'ESP32
- Vérifiez que le code a été correctement téléversé
- Regardez le moniteur série pour voir les messages d'erreur

### L'ESP32 redémarre lors de la réception

- Augmentez la taille du buffer JSON : `DynamicJsonDocument doc(8192);`
- Vérifiez l'alimentation de l'ESP32 (utilisez un câble USB de bonne qualité)

### Erreur de parsing JSON

- Vérifiez que la bibliothèque ArduinoJson est installée (version 6.x recommandée)
- Augmentez la taille du document JSON si vous avez beaucoup d'événements

## Avantages du mode Access Point

✅ **Pas besoin de routeur WiFi** : L'ESP32 crée son propre réseau
✅ **Connexion directe** : Communication plus rapide et fiable
✅ **Portable** : Fonctionne n'importe où, même sans Internet
✅ **Sécurisé** : Réseau protégé par mot de passe

## Stockage des données

Les événements sont sauvegardés dans la mémoire flash de l'ESP32 (SPIFFS) et persistent même après un redémarrage.

Pour lire les événements sauvegardés :
- Via HTTP : `GET http://192.168.4.1/events`
- Via navigateur : `http://192.168.4.1`
- Via code : utilisez la fonction `handleGetEvents()`

## Prochaines étapes

Vous pouvez maintenant :
1. Implémenter la logique pour déclencher les actions selon les conditions
2. Ajouter des capteurs (DHT22 pour température/humidité, photorésistance pour luminosité)
3. Implémenter un système de planification pour les dates/heures
4. Ajouter une LED ou un buzzer pour confirmer la réception des données
5. Créer une page web hébergée sur l'ESP32 pour configurer les événements

## Note importante sur la batterie

En mode Access Point, l'ESP32 consomme plus d'énergie. Pour une utilisation sur batterie :
- Utilisez une batterie d'au moins 500mAh
- Implémentez un mode veille (deep sleep) entre les utilisations
- Ajoutez un bouton pour activer/désactiver le point d'accès
