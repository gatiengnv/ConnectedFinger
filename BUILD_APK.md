# Guide de compilation APK pour FingerKonnect

## 📱 Créer un APK autonome (sans serveur de développement)

### Prérequis
- ✅ Android Studio installé
- ✅ SDK Android configuré
- ✅ Variables d'environnement configurées (ANDROID_HOME)

### Option 1 : APK de Debug (Rapide)

Cette méthode crée un APK de debug qui fonctionne immédiatement sans configuration supplémentaire.

```bash
cd /Users/gatiengenevois/Desktop/ConnectedFinger
cd android
./gradlew assembleDebug
```

**L'APK sera généré dans :**
`android/app/build/outputs/apk/debug/app-debug.apk`

### Option 2 : APK de Release (Optimisé)

Pour une version optimisée et plus petite :

#### 1. Générer une clé de signature (première fois seulement)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Répondez aux questions :**
- Mot de passe : (choisissez un mot de passe, ex: fingerkonnect123)
- Nom, Organisation : (vos informations)

#### 2. Configurer la signature

Créez le fichier `android/gradle.properties` (s'il n'existe pas) et ajoutez :

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=fingerkonnect123
MYAPP_RELEASE_KEY_PASSWORD=fingerkonnect123
```

#### 3. Compiler l'APK de Release

```bash
cd /Users/gatiengenevois/Desktop/ConnectedFinger/android
./gradlew assembleRelease
```

**L'APK sera généré dans :**
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🚀 Installation rapide (recommandé pour commencer)

Exécutez simplement cette commande depuis le dossier du projet :

```bash
cd /Users/gatiengenevois/Desktop/ConnectedFinger
npx react-native build-android --mode=release
```

L'APK sera créé automatiquement !

---

## 📲 Installer l'APK sur votre téléphone

### Méthode 1 : Via câble USB
```bash
# Activer le mode développeur sur votre téléphone
# Connecter le téléphone en USB
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Méthode 2 : Transfert direct
1. Copiez le fichier APK sur votre téléphone
2. Ouvrez le fichier depuis le gestionnaire de fichiers
3. Autorisez l'installation depuis des sources inconnues
4. Installez l'application

---

## ⚠️ Notes importantes

### Permissions requises
L'application nécessite les permissions suivantes (déjà configurées) :
- ✅ INTERNET - pour communiquer avec l'ESP32
- ✅ ACCESS_NETWORK_STATE - pour détecter le WiFi
- ✅ ACCESS_WIFI_STATE - pour lire le nom du réseau WiFi

### Pour Android 13+
Si vous ciblez Android 13+, ajoutez cette permission dans `android/app/src/main/AndroidManifest.xml` :
```xml
<uses-permission android:name="android.permission.NEARBY_WIFI_DEVICES" />
```

### Tester l'APK
1. Installez l'APK sur votre téléphone
2. Connectez-vous au WiFi "FingerKonnect"
3. Ouvrez l'application
4. Le statut WiFi devrait afficher "✓ Connecté"
5. Créez un événement et testez la synchronisation

---

## 🔧 Dépannage

### Erreur : "SDK location not found"
```bash
echo "sdk.dir=/Users/$USER/Library/Android/sdk" > android/local.properties
```

### Erreur de build
```bash
# Nettoyer le cache
cd android
./gradlew clean
./gradlew assembleDebug
```

### APK trop volumineux
L'APK de release est optimisé et plus petit. Utilisez la méthode de release.

### L'application ne détecte pas le WiFi
Vérifiez que les permissions sont accordées dans les paramètres de l'application.

---

## 📊 Comparaison des types d'APK

| Type | Taille | Optimisation | Signature | Utilisation |
|------|--------|--------------|-----------|-------------|
| Debug | ~40-50 MB | Aucune | Debug key | Tests rapides |
| Release | ~20-30 MB | Minification | Votre clé | Production |

---

## 🎯 Commande rapide tout-en-un

Pour créer et installer directement sur un téléphone connecté :

```bash
cd /Users/gatiengenevois/Desktop/ConnectedFinger
cd android && ./gradlew assembleDebug && adb install app/build/outputs/apk/debug/app-debug.apk
```

