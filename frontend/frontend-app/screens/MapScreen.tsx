import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, TextInput, Text, TouchableOpacity, ScrollView, Keyboard, TouchableWithoutFeedback, } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Image } from 'react-native';
import toiletIcon from '../assets/icons/toilet.png';

const MapScreen = () => {
  const [region, setRegion] = useState<Region | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [bathroomMarkers, setBathroomMarkers] = useState<PlaceResult[]>([]);
  const mapRef = useRef<MapView | null>(null);
  const regionDebounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  

  // Types for place results from Google Places API
  type PlaceResult = {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    name: string;
    vicinity: string;
    types: string[];
  };

  // Style to hide points of interest (like other business icons)
  const mapStyle = [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  ];

  // Get user's location on initial load
  useEffect(() => {
    const initializeLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
  
      const location = await Location.getCurrentPositionAsync({});
      const userRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
  
      setRegion(userRegion);
      setTimeout(() => {
        fetchNearbyBathrooms(userRegion);
      }, 500);
    };
  
    initializeLocation();
  }, []);

  const getRadiusForZoom = (latitude: number): number => {
    if (latitude < 0.02) return 1000;
    if (latitude < 0.05) return 3000;
    if (latitude < 0.1) return 5000;
    return 8000;
  }
  

  // Fetch bathrooms using Nearby Search API (REST/JSON)
  const fetchNearbyBathrooms = async (region: Region) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
    const radius = getRadiusForZoom(region.latitudeDelta);
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${region.latitude},${region.longitude}&radius=${radius}&keyword=restroom&key=${apiKey}`;
    const ALLOWED_PLACE_TYPES = ['gas_station'];

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        const results = data.results as PlaceResult[];
        const filtered = results.filter(place =>
          place.types?.some(type => ALLOWED_PLACE_TYPES.includes(type))
        );
        setBathroomMarkers(filtered);
      } else {
        console.warn('No restrooms found nearby');
      }
    } catch (error) {
      console.error('Failed to fetch bathrooms:', error);
      alert('Error loading bathrooms.');
    }
  };

  // Fetch autocomplete suggestions (REST/JSON)
  const fetchAutocomplete = async (input: string) => {
    setSearchQuery(input);
    if (!input) {
      setPredictions([]);
      return;
    }

    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&types=(regions)&key=${apiKey}`
      );
      const data = await res.json();
      if (data.status === 'OK') {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
  };

  // User taps a prediction
  const handleSelectPrediction = async (prediction: any) => {
    setSearchQuery(prediction.description);
    Keyboard.dismiss();
    setPredictions([]);
    
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;
      const details = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${apiKey}`
      );
      const data = await details.json();
      const { lat, lng } = data.result.geometry.location;

      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      mapRef.current?.animateToRegion(newRegion);
      fetchNearbyBathrooms(newRegion);
    } catch (error) {
      console.error('Prediction details error:', error);
    }
  };

  // Fetch users current location
  const centerToUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access location was denied');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const newRegion = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setRegion(newRegion)
    mapRef.current?.animateToRegion(newRegion);
    fetchNearbyBathrooms(newRegion);
  };

  if (!region) return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* 🔎 Search Bar + Autocomplete Predictions */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchInputContainer}>
            <TextInput
              placeholder="Search by City, State, or Zip"
              placeholderTextColor="#aaa"
              value={searchQuery}
              onChangeText={fetchAutocomplete}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>x</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {predictions.length > 0 && (
            <ScrollView style={styles.predictionsList} keyboardShouldPersistTaps="handled">
              {predictions.map((prediction, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectPrediction(prediction)}
                  style={styles.predictionItem}
                >
                  <Text>{prediction.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
  
        {/* 🗺️ Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          region={region}
          showsUserLocation
          showsMyLocationButton={false}
          style={StyleSheet.absoluteFillObject}
          customMapStyle={mapStyle}
          onRegionChangeComplete={(newRegion) => {
            if (regionDebounceTimeout.current) {
              clearTimeout(regionDebounceTimeout.current);
            }
            
            regionDebounceTimeout.current = setTimeout(() => {
              // setRegion(newRegion);
              fetchNearbyBathrooms(newRegion);
            }, 1000)
          }}
        >
          <Marker coordinate={region} title="You Are Here" />
          {bathroomMarkers.map((place, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              }}
              title={place.name}
              description={place.vicinity}
              >
              <Image
                source={toiletIcon}
                style={{ width: 35, height: 35}}
                resizeMode='contain'
                
              // image={toiletIcon}
              />
            </Marker>
          ))}
        </MapView>
        <TouchableOpacity style={styles.centerButton} onPress={centerToUserLocation}>
          <Text style={styles.centerButtonText}>📍</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );  
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    padding: 10,
    backgroundColor: 'white',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 4,
    elevation: 3,
  },
  
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#f2f2f2',
    borderRadius: 6,
  },
  
  predictionsList: {
    marginTop: 8,
    maxHeight: 200,
    backgroundColor: 'white',
    borderRadius: 6,
    overflow: 'hidden',
  },
  
  predictionItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },  
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  
  clearButton: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  clearButtonText: {
    fontSize: 18,
    color: '#888',
  },
  centerButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  centerButtonText: {
    fontSize: 20,
  },  
  
});

export default MapScreen;
