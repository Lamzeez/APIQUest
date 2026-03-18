import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MATI_COORDS = {
  latitude: 6.9537,
  longitude: 126.2407,
};

export default function WeatherScreen() {
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY;

  const fetchWeatherData = useCallback(async () => {
    if (!WEATHER_API_KEY) {
      setError('Weather API key is missing.');
      setLoading(false);
      return;
    }

    try {
      // Fetch Current Weather
      const currentRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${MATI_COORDS.latitude}&lon=${MATI_COORDS.longitude}&appid=${WEATHER_API_KEY}&units=metric`
      );
      if (!currentRes.ok) throw new Error('Failed to fetch current weather');
      const currentData = await currentRes.json();
      if (currentData && currentData.main) {
        setCurrentWeather(currentData);
      }

      // Fetch 5-Day Forecast
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${MATI_COORDS.latitude}&lon=${MATI_COORDS.longitude}&appid=${WEATHER_API_KEY}&units=metric`
      );
      if (!forecastRes.ok) throw new Error('Failed to fetch forecast');
      const forecastData = await forecastRes.json();
      
      if (forecastData && forecastData.list) {
        const dailyForecasts = forecastData.list.filter((item: any) => item.dt_txt.includes('12:00:00'));
        setForecast(dailyForecasts);
      }
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error fetching weather data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [WEATHER_API_KEY]);

  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeatherData();
  };

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('cloud')) return 'cloud';
    if (desc.includes('rain')) return 'rainy';
    if (desc.includes('clear')) return 'sunny';
    if (desc.includes('storm') || desc.includes('thunder')) return 'thunderstorm';
    return 'partly-sunny';
  };

  if (loading) {
    return (
      <LinearGradient colors={['#E0F2FE', '#F8FAFC']} style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading Weather Data...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#E0F2FE', '#F8FAFC']} style={{ flex: 1 }}>
        <SafeAreaView style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={60} color="#FF5252" />
            <Text style={styles.errorTitle}>Oops!</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchWeatherData}>
              <Text style={styles.retryText}>Try Again</Text>
              <Ionicons name="refresh" size={18} color="#fff" style={{marginLeft: 8}} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#E0F2FE', '#F8FAFC']} style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007BFF" />}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Mati City</Text>
              <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>
            <TouchableOpacity style={styles.refreshCircle} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color="#007BFF" />
            </TouchableOpacity>
          </View>

          {currentWeather && currentWeather.main ? (
            <View style={styles.mainCard}>
              <View style={styles.currentWeatherRow}>
                <View>
                  <Text style={styles.currentTemp}>{Math.round(currentWeather.main.temp)}°</Text>
                  <Text style={styles.currentCondition}>{currentWeather.weather?.[0]?.description || 'N/A'}</Text>
                  <Text style={styles.feelsLike}>Feels like {Math.round(currentWeather.main.feels_like)}°</Text>
                </View>
                <View style={styles.mainIconContainer}>
                  <Ionicons name={getWeatherIcon(currentWeather.weather?.[0]?.description || '') as any} size={100} color="#fff" />
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <View style={styles.statIconBackground}>
                    <Ionicons name="water-outline" size={20} color="#00E5FF" />
                  </View>
                  <Text style={styles.statValue}>{currentWeather.main.humidity}%</Text>
                  <Text style={styles.statLabel}>Humidity</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.statIconBackground}>
                    <Ionicons name="speedometer-outline" size={20} color="#FFD700" />
                  </View>
                  <Text style={styles.statValue}>{currentWeather.wind?.speed || 0}m/s</Text>
                  <Text style={styles.statLabel}>Wind</Text>
                </View>
                <View style={styles.statItem}>
                  <View style={styles.statIconBackground}>
                    <Ionicons name="eye-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statValue}>{((currentWeather.visibility || 0) / 1000).toFixed(1)}km</Text>
                  <Text style={styles.statLabel}>Visibility</Text>
                </View>
              </View>
            </View>
          ) : !loading && !error && (
            <View style={{padding: 20, alignItems: 'center'}}>
              <Text style={{color: '#64748B'}}>Current weather data unavailable</Text>
            </View>
          )}
          <View style={styles.forecastSection}>
            <Text style={styles.sectionTitle}>5-Day Forecast</Text>
            <View style={styles.forecastList}>
              {forecast.map((item, index) => {
                const date = new Date(item.dt * 1000);
                const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' });
                
                return (
                  <View key={index} style={styles.forecastItem}>
                    <Text style={styles.forecastDay}>{dayName}</Text>
                    <View style={styles.forecastMiddle}>
                      <Ionicons 
                        name={getWeatherIcon(item.weather[0].description) as any} 
                        size={24} 
                        color="#007BFF" 
                      />
                      <Text style={styles.forecastDesc}>{item.weather[0].main}</Text>
                    </View>
                    <View style={styles.forecastTemps}>
                      <Text style={styles.maxTemp}>{Math.round(item.main.temp_max)}°</Text>
                      <Text style={styles.minTemp}>{Math.round(item.main.temp_min)}°</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </SafeAreaView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  refreshCircle: {
    backgroundColor: '#E2E8F0',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    backgroundColor: '#007BFF',
    marginHorizontal: 20,
    borderRadius: 35,
    padding: 25,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  currentWeatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentTemp: {
    fontSize: 80,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -2,
  },
  currentCondition: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'capitalize',
    marginTop: -10,
    fontWeight: '600',
  },
  feelsLike: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 5,
  },
  mainIconContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 25,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBackground: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  forecastSection: {
    paddingHorizontal: 25,
    marginTop: 35,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 20,
  },
  forecastList: {
    gap: 12,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  forecastDay: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    flex: 1.2,
  },
  forecastMiddle: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  forecastDesc: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  forecastTemps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  maxTemp: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  minTemp: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  errorCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 18,
    marginTop: 25,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});