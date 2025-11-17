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
import NetInfo from '@react-native-community/netinfo';
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

  const [action, setAction] = useState('');
  const [humidity, setHumidity] = useState('');
  const [temperature, setTemperature] = useState('');
  const [luminosity, setLuminosity] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [repeat, setRepeat] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const [events, setEvents] = useState<Event[]>([]);
  const [editingIndex, setEditingIndex] = useState(-1);

  const [isSyncing, setIsSyncing] = useState(false);
  const [wifiName, setWifiName] = useState<string | null>(null);

  const ESP32_IP = '192.168.4.1';

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());

  const [showActionModal, setShowActionModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);

  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const actionOptions = [
    { value: '', label: '-- Choose an action --' },
    { value: 'click', label: 'Click' },
    { value: 'double_click', label: 'Double Click' },
  ];

  const repeatOptions = [
    { value: '', label: '-- Choose an option --' },
    { value: 'always', label: 'Always' },
    { value: 'one_time', label: 'One Time' },
    { value: 'days', label: 'Custom Days' },
  ];

  useEffect(() => {
    loadEvents();
    checkWifiConnection();

    const unsubscribe = NetInfo.addEventListener(_state => {
      checkWifiConnection();
    });

    return () => unsubscribe();
  }, []);

  const loadEvents = async () => {
    try {
      const savedEvents = await AsyncStorage.getItem('eventsData');
      if (savedEvents) {
        const data = JSON.parse(savedEvents);
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const checkWifiConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      console.log('NetInfo state:', JSON.stringify(state, null, 2));

      if (state.type === 'wifi') {
        const ssid = state.details?.ssid || null;
        setWifiName(ssid);
        console.log('WiFi SSID:', ssid);
      } else {
        setWifiName(null);
        console.log('Not connected to WiFi, type:', state.type);
      }
    } catch (error) {
      console.error('Error checking WiFi:', error);
      setWifiName(null);
    }
  };

  const saveEvents = async (newEvents: Event[]) => {
    try {
      await AsyncStorage.setItem('eventsData', JSON.stringify({ events: newEvents }));
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const syncToEsp32 = async () => {

    if (events.length === 0) {
      Alert.alert('Error', 'No events to sync. Please add at least one event.');
      return;
    }

    setIsSyncing(true);

    try {
      const dataToSend = { events };

      const response = await fetch(`http://${ESP32_IP}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        Alert.alert('Success', `${events.length} event(s) synced successfully!`);
      } else {
        const errorText = await response.text();
        Alert.alert('Error', `Sync failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      Alert.alert(
        'Connection Error',
        `Unable to connect to ESP32.\n\nMake sure that:\n- ESP32 is powered on\n- You are connected to "FingerKonnect" WiFi\n- ESP32 is functioning properly\n\nError: ${error.message}`
      );
    } finally {
      setIsSyncing(false);
    }
  };


  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const validateForm = (): boolean => {
    if (!action) {
      Alert.alert('Error', 'Please select an action.');
      return false;
    }

    const hasCondition = humidity || temperature || luminosity;
    const hasDateTime = date || hour;

    if (!hasCondition && !hasDateTime) {
      Alert.alert(
        'Error',
        'You must specify at least one condition (humidity, temperature, luminosity) OR a date/time.'
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
      repeat: repeatValue || 'one_time',
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
    Alert.alert('Success', 'Event added successfully!');
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
    Alert.alert('Success', 'Event updated successfully!');
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
      setRepeat(event.repeat || 'one_time');
      setSelectedDays([]);
    }
  };

  const handleDeleteEvent = (index: number) => {
    Alert.alert(
      'Confirmation',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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

  const resetAction = () => {
    setAction('');
  };

  const resetHumidity = () => {
    setHumidity('');
  };

  const resetTemperature = () => {
    setTemperature('');
  };

  const resetLuminosity = () => {
    setLuminosity('');
  };

  const resetDate = () => {
    setDate('');
    setSelectedDate(new Date());
  };

  const resetHour = () => {
    setHour('');
    setSelectedTime(new Date());
  };

  const resetRepeat = () => {
    setRepeat('');
    setSelectedDays([]);
  };

  const handleHumidityChange = (value: string) => {
    if (value === '' || value === '-') {
      setHumidity(value);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setHumidity(value);
    }
  };

  const handleTemperatureChange = (value: string) => {
    if (value === '' || value === '-') {
      setTemperature(value);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= -100 && numValue <= 100) {
      setTemperature(value);
    }
  };

  const handleLuminosityChange = (value: string) => {
    if (value === '' || value === '-') {
      setLuminosity(value);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setLuminosity(value);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(-1);
    resetForm();
  };

  const handleDateChange = (event: any, newDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (newDate) {
      setSelectedDate(newDate);
      const day = String(newDate.getDate()).padStart(2, '0');
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const year = newDate.getFullYear();
      setDate(`${day}/${month}/${year}`);
      setRepeat('one_time');
      setSelectedDays([]);
    }
  };

  const handleTimeChange = (event: any, newTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (newTime) {
      setSelectedTime(newTime);
      const hours = String(newTime.getHours()).padStart(2, '0');
      const minutes = String(newTime.getMinutes()).padStart(2, '0');
      setHour(`${hours}:${minutes}`);
    }
  };

  const handleRepeatChange = (value: string) => {
    setRepeat(value);
    if (value !== 'days') {
      setSelectedDays([]);
    }
    if (value !== 'one_time' && value !== '') {
      setDate('');
      setSelectedDate(new Date());
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top }]}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>FingerKonnect</Text>

        <View style={styles.form}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Action:</Text>
            {action && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetAction}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowActionModal(true)}
            accessibilityState={{ disabled: false }}
          >
            <Text style={[styles.selectButtonText, !action && styles.selectPlaceholder]}>
              {action ? actionOptions.find(opt => opt.value === action)?.label : '-- Choose an action --'}
            </Text>
            <Text style={styles.selectArrow}>▼</Text>
          </TouchableOpacity>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Humidity (%):</Text>
            {humidity && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetHumidity}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={humidity}
            onChangeText={handleHumidityChange}
            keyboardType="numeric"
            placeholder="0-100"
            placeholderTextColor="#999"
          />

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Temperature (°C):</Text>
            {temperature && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetTemperature}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={temperature}
            onChangeText={handleTemperatureChange}
            keyboardType="numeric"
            placeholder="-100 to 100"
            placeholderTextColor="#999"
          />

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Luminosity (%):</Text>
            {luminosity && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetLuminosity}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={luminosity}
            onChangeText={handleLuminosityChange}
            keyboardType="numeric"
            placeholder="0-100"
            placeholderTextColor="#999"
          />

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Date:</Text>
            {date && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetDate}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.dateButton, (repeat && repeat !== 'one_time' && repeat !== '') && styles.dateButtonDisabled]}
            onPress={() => {
              if (repeat && repeat !== 'one_time' && repeat !== '') {
                Alert.alert('Date Locked', 'You must first set Repeat to "One Time" to select a date.');
                return;
              }
              setShowDatePicker(true);
            }}
            disabled={!!(repeat && repeat !== 'one_time' && repeat !== '')}
            accessibilityState={{ disabled: Boolean(repeat && repeat !== 'one_time' && repeat !== '') }}
          >
            <Text style={[styles.dateButtonText, (repeat && repeat !== 'one_time' && repeat !== '') && styles.dateButtonTextDisabled]}>
              {date || 'Select a date'}
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

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Hour:</Text>
            {hour && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetHour}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
            accessibilityState={{ disabled: false }}
          >
            <Text style={styles.dateButtonText}>
              {hour || 'Select a time'}
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

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Repeat:</Text>
            {repeat && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={resetRepeat}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.selectButton, date && styles.selectButtonDisabled]}
            onPress={() => {
              if (date) {
                Alert.alert('Repeat Locked', 'Cannot modify Repeat when a date is selected. Repeat is automatically "One Time".');
                return;
              }
              setShowRepeatModal(true);
            }}
            disabled={Boolean(date)}
            accessibilityState={{ disabled: Boolean(date) }}
          >
            <Text style={[styles.selectButtonText, !repeat && styles.selectPlaceholder, date && styles.selectDisabled]}>
              {repeat ? repeatOptions.find(opt => opt.value === repeat)?.label : '-- Choose an option --'}
            </Text>
            <Text style={[styles.selectArrow, date && styles.selectDisabled]}>▼</Text>
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
                  accessibilityState={{ disabled: false }}
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

          <View style={styles.formActions}>
            {editingIndex === -1 ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddEvent}
                accessibilityState={{ disabled: false }}
              >
                <Text style={styles.buttonText}>Add Event</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={handleUpdateEvent}
                  accessibilityState={{ disabled: false }}
                >
                  <Text style={styles.buttonText}>Update</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEdit}
                  accessibilityState={{ disabled: false }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetForm}
              accessibilityState={{ disabled: false }}
            >
              <Text style={styles.buttonText}>Reset All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.wifiStatusContainer}>
            <View style={styles.wifiStatusContent}>
              <View style={styles.wifiNameContainer}>
                <Text style={styles.wifiNameLabel}>WiFi Network: </Text>
                <Text style={styles.wifiNameValue}>
                  {wifiName || 'Not connected'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={syncToEsp32}
            disabled={isSyncing}
            accessibilityState={{ disabled: isSyncing }}
          >
            <Text style={styles.syncButtonText}>
              {isSyncing ? '⏳ Syncing...' : '🔄 Sync to ESP32'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsList}>
          <Text style={styles.eventsTitle}>Saved Events ({events.length})</Text>
          {events.length === 0 ? (
            <Text style={styles.noEvents}>No saved events.</Text>
          ) : (
            events.map((event, index) => {
              const conditions = [];
              if (event.condition.humidity !== undefined)
                conditions.push(`Humidity: ${event.condition.humidity}%`);
              if (event.condition.temperature !== undefined)
                conditions.push(`Temperature: ${event.condition.temperature}°C`);
              if (event.condition.luminosity !== undefined)
                conditions.push(`Luminosity: ${event.condition.luminosity}%`);
              if (event.condition.date) conditions.push(`Date: ${event.condition.date}`);
              if (event.condition.hour) conditions.push(`Time: ${event.condition.hour}`);

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
                  <Text style={styles.eventRepeat}>Repeat: {event.repeat}</Text>
                  <View style={styles.eventActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditEvent(index)}
                      accessibilityState={{ disabled: false }}
                    >
                      <Text style={styles.buttonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteEvent(index)}
                      accessibilityState={{ disabled: false }}
                    >
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

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
          accessibilityState={{ disabled: false }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose an action</Text>
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
                accessibilityState={{ disabled: false }}
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
              accessibilityState={{ disabled: false }}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
          accessibilityState={{ disabled: false }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a repeat option</Text>
            {repeatOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  repeat === option.value && styles.modalOptionSelected
                ]}
                onPress={() => {
                  handleRepeatChange(option.value);
                  setShowRepeatModal(false);
                }}
                accessibilityState={{ disabled: false }}
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
              accessibilityState={{ disabled: false }}
            >
              <Text style={styles.modalCloseText}>Close</Text>
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
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
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
  selectButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
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
    fontSize: 16,
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
  dateButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  dateButtonTextDisabled: {
    color: '#ccc',
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
  syncButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  wifiStatusContainer: {
    marginTop: 10,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  wifiStatusContent: {
    flex: 1,
  },
  wifiStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wifiStatusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  wifiStatusConnected: {
    backgroundColor: '#28a745',
  },
  wifiStatusDisconnected: {
    backgroundColor: '#dc3545',
  },
  wifiStatusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  wifiStatusTextConnected: {
    color: '#28a745',
  },
  wifiStatusTextDisconnected: {
    color: '#dc3545',
  },
  wifiNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  wifiNameLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  wifiNameValue: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '600',
  },
  wifiNetworkName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  wifiWarning: {
    color: '#dc3545',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 5,
  },
});

export default App;
