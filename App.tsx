/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

interface EventCondition {
  humidity?: number;
  temperature?: number;
  luminosity?: number;
  date?: string;
  hour?: string;
}

interface Event {
  action: string;
  condition: EventCondition;
  repeat: string;
}

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  // États du formulaire
  const [action, setAction] = useState('');
  const [humidity, setHumidity] = useState('');
  const [temperature, setTemperature] = useState('');
  const [luminosity, setLuminosity] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [repeat, setRepeat] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // États de l'application
  const [events, setEvents] = useState<Event[]>([]);
  const [editingIndex, setEditingIndex] = useState(-1);

  // États pour les date/time pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());

  // États pour les modals de sélection
  const [showActionModal, setShowActionModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const actionOptions = [
    { value: '', label: '-- Choisir une action --' },
    { value: 'click', label: 'Click' },
    { value: 'double_click', label: 'Double Click' },
  ];

  const repeatOptions = [
    { value: '', label: '-- Choisir une option --' },
    { value: 'always', label: 'Always' },
    { value: 'never', label: 'Never' },
    { value: 'days', label: 'Custom Days' },
  ];

  // Charger les événements au démarrage
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const savedEvents = await AsyncStorage.getItem('eventsData');
      if (savedEvents) {
        const data = JSON.parse(savedEvents);
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    }
  };

  const saveEvents = async (newEvents: Event[]) => {
    try {
      await AsyncStorage.setItem('eventsData', JSON.stringify({ events: newEvents }));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const validateForm = (): boolean => {
    if (!action) {
      Alert.alert('Erreur', 'Veuillez sélectionner une action.');
      return false;
    }

    const hasCondition = humidity || temperature || luminosity;

    if (!hasCondition && (!date || !hour)) {
      Alert.alert(
        'Erreur',
        'Vous devez spécifier à la fois une date ET une heure lorsque vous ne spécifiez pas de conditions.'
      );
      return false;
    }

    return true;
  };

  const createEventObject = (): Event => {
    let repeatValue = repeat;
    if (repeat === 'days') {
      repeatValue = selectedDays.join('');
    }

    const event: Event = {
      action: action,
      condition: {},
      repeat: repeatValue || 'never',
    };

    if (humidity) event.condition.humidity = parseFloat(humidity);
    if (temperature) event.condition.temperature = parseFloat(temperature);
    if (luminosity) event.condition.luminosity = parseFloat(luminosity);
    if (date) event.condition.date = date;
    if (hour) event.condition.hour = hour;

    return event;
  };

  const handleAddEvent = () => {
    if (!validateForm()) return;

    const newEvent = createEventObject();
    const newEvents = [...events, newEvent];
    setEvents(newEvents);
    saveEvents(newEvents);
    resetForm();
    Alert.alert('Succès', 'Événement ajouté avec succès !');
  };

  const handleUpdateEvent = () => {
    if (editingIndex === -1) return;
    if (!validateForm()) return;

    const updatedEvent = createEventObject();
    const newEvents = [...events];
    newEvents[editingIndex] = updatedEvent;
    setEvents(newEvents);
    saveEvents(newEvents);
    cancelEdit();
    Alert.alert('Succès', 'Événement mis à jour avec succès !');
  };

  const handleEditEvent = (index: number) => {
    const event = events[index];
    setEditingIndex(index);
    setAction(event.action);
    setHumidity(event.condition.humidity?.toString() || '');
    setTemperature(event.condition.temperature?.toString() || '');
    setLuminosity(event.condition.luminosity?.toString() || '');
    setDate(event.condition.date || '');
    setHour(event.condition.hour || '');

    if (event.repeat && days.some(day => event.repeat.includes(day))) {
      setRepeat('days');
      const eventDays = days.filter(day => event.repeat.includes(day));
      setSelectedDays(eventDays);
    } else {
      setRepeat(event.repeat || 'never');
      setSelectedDays([]);
    }
  };

  const handleDeleteEvent = (index: number) => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cet événement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newEvents = events.filter((_, i) => i !== index);
            setEvents(newEvents);
            saveEvents(newEvents);
            if (editingIndex === index) {
              cancelEdit();
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setAction('');
    setHumidity('');
    setTemperature('');
    setLuminosity('');
    setDate('');
    setHour('');
    setRepeat('');
    setSelectedDays([]);
    setSelectedDate(new Date());
    setSelectedTime(new Date());
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    resetForm();
  };

  const exportToConsole = () => {
    const jsonData = JSON.stringify({ events }, null, 2);
    console.log('=== EVENTS JSON ===');
    console.log(jsonData);
    Alert.alert('Succès', 'Les données ont été exportées dans la console. Vérifiez les logs de votre application.');
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedDate(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      setDate(`${day}/${month}/${year}`);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setSelectedTime(selectedTime);
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      setHour(`${hours}:${minutes}`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Event JSON Builder</Text>

        {/* Bouton d'export */}
        <View style={styles.fileActions}>
          <TouchableOpacity style={styles.saveButton} onPress={exportToConsole}>
            <Text style={styles.buttonText}>Exporter vers Console</Text>
          </TouchableOpacity>
        </View>

        {/* Formulaire */}
        <View style={styles.form}>
          <Text style={styles.label}>Action:</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowActionModal(true)}
          >
            <Text style={[styles.selectButtonText, !action && styles.selectPlaceholder]}>
              {action ? actionOptions.find(opt => opt.value === action)?.label : '-- Choisir une action --'}
            </Text>
            <Text style={styles.selectArrow}>▼</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Humidity (%):</Text>
          <TextInput
            style={styles.input}
            value={humidity}
            onChangeText={setHumidity}
            keyboardType="numeric"
            placeholder="e.g. 70"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Temperature (°C):</Text>
          <TextInput
            style={styles.input}
            value={temperature}
            onChangeText={setTemperature}
            keyboardType="numeric"
            placeholder="e.g. 35"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Luminosity (lx):</Text>
          <TextInput
            style={styles.input}
            value={luminosity}
            onChangeText={setLuminosity}
            keyboardType="numeric"
            placeholder="e.g. 200"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Date:</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {date || 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}

          <Text style={styles.label}>Hour:</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {hour || 'Sélectionner une heure'}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
              is24Hour={true}
            />
          )}

          <Text style={styles.label}>Repeat:</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowRepeatModal(true)}
            disabled={!!date}
          >
            <Text style={[styles.selectButtonText, !repeat && styles.selectPlaceholder, !!date && styles.selectDisabled]}>
              {repeat ? repeatOptions.find(opt => opt.value === repeat)?.label : '-- Choisir une option --'}
            </Text>
            <Text style={[styles.selectArrow, !!date && styles.selectDisabled]}>▼</Text>
          </TouchableOpacity>

          {repeat === 'days' && (
            <View style={styles.daysContainer}>
              {days.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day) && styles.dayButtonSelected,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      selectedDays.includes(day) && styles.dayButtonTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Boutons d'action */}
          <View style={styles.formActions}>
            {editingIndex === -1 ? (
              <TouchableOpacity style={styles.addButton} onPress={handleAddEvent}>
                <Text style={styles.buttonText}>Ajouter un événement</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.updateButton} onPress={handleUpdateEvent}>
                  <Text style={styles.buttonText}>Mettre à jour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                  <Text style={styles.buttonText}>Annuler</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
              <Text style={styles.buttonText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Liste des événements */}
        <View style={styles.eventsList}>
          <Text style={styles.eventsTitle}>Événements enregistrés ({events.length})</Text>
          {events.length === 0 ? (
            <Text style={styles.noEvents}>Aucun événement enregistré.</Text>
          ) : (
            events.map((event, index) => {
              const conditions = [];
              if (event.condition.humidity !== undefined)
                conditions.push(`Humidité: ${event.condition.humidity}%`);
              if (event.condition.temperature !== undefined)
                conditions.push(`Température: ${event.condition.temperature}°C`);
              if (event.condition.luminosity !== undefined)
                conditions.push(`Luminosité: ${event.condition.luminosity}lx`);
              if (event.condition.date) conditions.push(`Date: ${event.condition.date}`);
              if (event.condition.hour) conditions.push(`Heure: ${event.condition.hour}`);

              return (
                <View
                  key={index}
                  style={[
                    styles.eventItem,
                    editingIndex === index && styles.eventItemEditing,
                  ]}
                >
                  <Text style={styles.eventAction}>Action: {event.action}</Text>
                  {conditions.length > 0 && (
                    <Text style={styles.eventConditions}>{conditions.join(', ')}</Text>
                  )}
                  <Text style={styles.eventRepeat}>Répétition: {event.repeat}</Text>
                  <View style={styles.eventActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditEvent(index)}
                    >
                      <Text style={styles.buttonText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEvent(index)}
                    >
                      <Text style={styles.buttonText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal pour Action */}
      <Modal
        visible={showActionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir une action</Text>
            {actionOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  action === option.value && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setAction(option.value);
                  setShowActionModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  action === option.value && styles.modalOptionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal pour Repeat */}
      <Modal
        visible={showRepeatModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRepeatModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRepeatModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir une option de répétition</Text>
            {repeatOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  repeat === option.value && styles.modalOptionSelected
                ]}
                onPress={() => {
                  setRepeat(option.value);
                  if (option.value !== 'days') {
                    setSelectedDays([]);
                  }
                  setShowRepeatModal(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  repeat === option.value && styles.modalOptionTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRepeatModal(false)}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fa',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  fileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  saveButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectPlaceholder: {
    color: '#999',
  },
  selectDisabled: {
    color: '#ccc',
  },
  selectArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  dayButton: {
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 5,
    padding: 10,
    margin: 5,
    minWidth: 45,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#007bff',
  },
  dayButtonText: {
    color: '#007bff',
    fontWeight: '500',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  formActions: {
    marginTop: 15,
  },
  addButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  eventsList: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  noEvents: {
    fontStyle: 'italic',
    color: '#666',
  },
  eventItem: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  eventItemEditing: {
    backgroundColor: '#f8f9fa',
    borderColor: '#007bff',
    borderWidth: 2,
  },
  eventAction: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  eventConditions: {
    color: '#555',
    marginBottom: 5,
  },
  eventRepeat: {
    color: '#555',
    marginBottom: 10,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#ffc107',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  modalOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionSelected: {
    backgroundColor: '#e7f3ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#007bff',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#6c757d',
    borderRadius: 5,
    alignItems: 'center',
  },
  modalCloseText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default App;
