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
  Animated,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import NetInfo from '@react-native-community/netinfo';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

interface EventCondition {
  humidity?: number;
  temperature?: number;
  luminosity?: number;
  date?: string;
  hour?: string;
}

interface Event {
  name: string;
  action: string;
  condition: EventCondition;
  repeat: string;
}

interface EventTemplate {
  name: string;
  description: string;
  icon: string;
  event: Event;
}

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [fadeAnim] = useState(new Animated.Value(0));

  const [name, setName] = useState('');
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
  const ESP32_IP = '192.168.4.1';

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());

  const [showActionModal, setShowActionModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);

  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const eventTemplates: EventTemplate[] = [
    {
      name: 'Morning Coffee',
      description: 'Click every day at 8:00 AM',
      icon: '☕',
      event: {
        name: 'Morning Coffee',
        action: 'click',
        condition: { hour: '08:00' },
        repeat: 'always',
      },
    },
    {
      name: 'Lunch Reminder',
      description: 'Click every day at 12:00 PM',
      icon: '🍽️',
      event: {
        name: 'Lunch Reminder',
        action: 'click',
        condition: { hour: '12:00' },
        repeat: 'always',
      },
    },
    {
      name: 'Wake Up Call',
      description: 'Double click at 7:00 AM',
      icon: '⏰',
      event: {
        name: 'Wake Up Call',
        action: 'double_click',
        condition: { hour: '07:00' },
        repeat: 'always',
      },
    },
    {
      name: 'Evening Routine',
      description: 'Click every day at 9:00 PM',
      icon: '🌙',
      event: {
        name: 'Evening Routine',
        action: 'click',
        condition: { hour: '21:00' },
        repeat: 'always',
      },
    },
    {
      name: 'Workday Start',
      description: 'Click weekdays at 9:00 AM',
      icon: '💼',
      event: {
        name: 'Workday Start',
        action: 'click',
        condition: { hour: '09:00' },
        repeat: 'MoTuWeThFr',
      },
    },
    {
      name: 'Weekend Alert',
      description: 'Click on weekends at 10:00 AM',
      icon: '🎉',
      event: {
        name: 'Weekend Alert',
        action: 'click',
        condition: { hour: '10:00' },
        repeat: 'SaSu',
      },
    },
    {
      name: 'Bright Light',
      description: 'Click when luminosity > 80%',
      icon: '☀️',
      event: {
        name: 'Bright Light',
        action: 'click',
        condition: { luminosity: 80 },
        repeat: 'always',
      },
    },
    {
      name: 'Hot Temperature',
      description: 'Click when temperature > 30°C',
      icon: '🌡️',
      event: {
        name: 'Hot Temperature',
        action: 'click',
        condition: { temperature: 30 },
        repeat: 'always',
      },
    },
  ];

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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEvents = async () => {
    try {
      const savedEvents = await AsyncStorage.getItem('eventsData');
      if (savedEvents) {
        const data = JSON.parse(savedEvents);
        // Add default names to events that don't have one (migration)
        const migratedEvents = (data.events || []).map((event: Event, index: number) => ({
          ...event,
          name: event.name || `Event ${index + 1}`,
        }));
        setEvents(migratedEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);
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
        `Unable to connect to your connected finger.\n\nMake sure that:\n- your connected finger is powered on\n- You are connected to "FingerKonnect" WiFi\n- Your connected finger is functioning properly\n\nError: ${error.message}`
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
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the event.');
      return false;
    }

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
      name: name.trim(),
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
    setName(event.name || '');
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
    setName('');
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

  const handleAddTemplate = (template: EventTemplate) => {
    const newEvents = [...events, template.event];
    setEvents(newEvents);
    saveEvents(newEvents);
    setShowShopModal(false);
    Alert.alert('Success', `"${template.name}" template added successfully!`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <View style={styles.header}>
        <Animated.View style={[styles.headerContent, { opacity: fadeAnim }]}>
          <Text style={styles.headerTitle}>FingerKonnect</Text>
          <Text style={styles.headerSubtitle}>Smart Automation Control</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => setShowShopModal(true)}
            accessibilityState={{ disabled: false }}
          >
            <Text style={styles.shopButtonText}>🛒 Templates Shop</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>⚙️ Event Configuration</Text>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>📝 Event Name</Text>
              {name && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setName('')}
                  accessibilityState={{ disabled: false }}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter event name"
              placeholderTextColor="#a0aec0"
            />
          </View>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>🎯 Action</Text>
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
                {action ? actionOptions.find(opt => opt.value === action)?.label : 'Choose an action'}
              </Text>
              <Text style={styles.selectArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>🌡️ Conditions</Text>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>💧 Humidity (%)</Text>
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
              placeholderTextColor="#a0aec0"
            />
          </View>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>🌡️ Temperature (°C)</Text>
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
              placeholderTextColor="#a0aec0"
            />
          </View>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>☀️ Luminosity (%)</Text>
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
              placeholderTextColor="#a0aec0"
            />
          </View>

          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>📅 Schedule</Text>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>📅 Date</Text>
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
          </View>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>🕐 Time</Text>
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
          </View>

          <View style={styles.fieldWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>🔁 Repeat</Text>
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
                {repeat ? repeatOptions.find(opt => opt.value === repeat)?.label : 'Choose repeat option'}
              </Text>
              <Text style={[styles.selectArrow, date && styles.selectDisabled]}>▼</Text>
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={syncToEsp32}
            disabled={isSyncing}
            accessibilityState={{ disabled: isSyncing }}
          >
            <Text style={styles.syncButtonText}>
              {isSyncing ? '⏳ Syncing...' : '🔄 Sync to your connected finger'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.eventsList, { opacity: fadeAnim }]}>
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
                  <Text style={styles.eventName}>{event.name || 'Unnamed Event'}</Text>
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
        </Animated.View>
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

      <Modal
        visible={showShopModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShopModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shopModalContent}>
            <Text style={styles.shopModalTitle}>📦 Templates Shop</Text>
            <Text style={styles.shopModalSubtitle}>
              Select a pre-configured event to add instantly
            </Text>
            <ScrollView
              style={styles.templatesScroll}
              showsVerticalScrollIndicator={false}
            >
              {eventTemplates.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.templateCard}
                  onPress={() => handleAddTemplate(template)}
                  accessibilityState={{ disabled: false }}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateIcon}>{template.icon}</Text>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={styles.templateDescription}>
                        {template.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.templateAddButton}>
                    <Text style={styles.templateAddText}>+ Add</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.shopCloseButton}
              onPress={() => setShowShopModal(false)}
              accessibilityState={{ disabled: false }}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    backgroundColor: '#667eea',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginTop: 40
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    marginTop: 5,
    fontWeight: '500',
  },
  shopButton: {
    backgroundColor: '#48bb78',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 16,
    shadowColor: '#48bb78',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  shopButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginTop: 8,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#fc8181',
    borderRadius: 14,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fc8181',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  label: {
    fontSize: 15,
    marginBottom: 8,
    fontWeight: '600',
    color: '#4a5568',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f7fafc',
    color: '#2d3748',
    fontWeight: '500',
  },
  selectButton: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f7fafc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: '#edf2f7',
    borderColor: '#cbd5e0',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#2d3748',
    flex: 1,
    fontWeight: '500',
  },
  selectPlaceholder: {
    color: '#a0aec0',
  },
  selectDisabled: {
    color: '#cbd5e0',
  },
  selectArrow: {
    fontSize: 14,
    color: '#667eea',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  dateButton: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f7fafc',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  dateButtonDisabled: {
    backgroundColor: '#edf2f7',
  },
  dateButtonTextDisabled: {
    color: '#cbd5e0',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  dayButton: {
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 50,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  dayButtonSelected: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayButtonText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },
  dayButtonTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  formActions: {
    marginTop: 20,
    gap: 10,
  },
  addButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  updateButton: {
    backgroundColor: '#48bb78',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#48bb78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cancelButton: {
    backgroundColor: '#718096',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#718096',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButton: {
    backgroundColor: '#f56565',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#f56565',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  eventsList: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 30,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  eventsTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#2d3748',
    letterSpacing: 0.3,
  },
  noEvents: {
    fontStyle: 'italic',
    color: '#a0aec0',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 15,
  },
  eventItem: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f7fafc',
  },
  eventItemEditing: {
    backgroundColor: '#ebf4ff',
    borderColor: '#667eea',
    borderWidth: 2,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  eventName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#667eea',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  eventAction: {
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 8,
    color: '#2d3748',
    letterSpacing: 0.2,
  },
  eventConditions: {
    color: '#4a5568',
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  eventRepeat: {
    color: '#718096',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#ed8936',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#ed8936',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: '#f56565',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#f56565',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#2d3748',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  modalOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f7fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  modalOptionSelected: {
    backgroundColor: '#ebf4ff',
    borderColor: '#667eea',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: '#667eea',
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#718096',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#718096',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalCloseText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  syncButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  syncButtonDisabled: {
    backgroundColor: '#cbd5e0',
    shadowOpacity: 0.1,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  wifiStatusContainer: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#f7fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  wifiStatusContent: {
    flex: 1,
  },
  wifiNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wifiNameLabel: {
    fontSize: 15,
    color: '#4a5568',
    fontWeight: '600',
  },
  wifiNameValue: {
    fontSize: 15,
    color: '#667eea',
    fontWeight: '700',
  },
  shopModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    width: '100%',
    height: '85%',
    marginTop: 'auto',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  shopModalTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  shopModalSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  templatesScroll: {
    flex: 1,
    marginBottom: 16,
  },
  templateCard: {
    backgroundColor: '#f7fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  templateIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  templateDescription: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  templateAddButton: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  templateAddText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  shopCloseButton: {
    backgroundColor: '#718096',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#718096',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default App;
