import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Platform } from 'react-native';

const BASE_URL = Platform.select({
    ios: 'http://192.168.68.54:10000',
    android: 'http://192.168.68.54:10000',
    default: 'http://localhost:10000'
});

const ReviewTestScreen = () => {
    const [bathroom, setBathroom] = useState(null);
    const [reviews, setReviews] = useState([]);

    useEffect (() => {
        // fetch('http://localhost:10000/bathrooms')
        fetch(`${BASE_URL}/bathrooms`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                setBathroom(data[0]);
                // return fetch(`http://localhost:10000/reviews/${data[0].id}`);
                return fetch(`${BASE_URL}/reviews/${data[0].id}`);
            } else {
                throw new Error('No bathrooms found');
            }
        })
        .then(res => res.json())
        .then(setReviews)
        .catch(err => console.error('Error:', err));
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bathroom Details</Text>

            {bathroom && (
                <View style={styles.card}>
                    <Text style={styles.name}>{bathroom.name}</Text>
                    <Text>Latitude: {bathroom.latitude}</Text>
                    <Text>Longitude: {bathroom.longitude}</Text>
                </View>
            )}

            <Text style={styles.subtitle}>Reviews</Text>
            <FlatList
                data={reviews}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.reviewCard}>
                        <Text>⭐ {item.rating}</Text>
                        <Text>{item.comment}</Text>
                    </View>
                )}
            />
        </View>
    );
};

export default ReviewTestScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        marginTop: 50,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom:8
    },
    subtitle: {
        fontSize: 18,
        marginTop: 16,
        marginBottom: 8
    },
    card: {
        padding: 12,
        backgroundColor: '#e6f7fb',
        borderRadius: 8,
        marginBottom: 12
    },
    name: {
        fontSize: 18,
        fontWeight: '600'
    },
    reviewCard: {
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f2f2f2',
        borderRadius: 6
    }
});