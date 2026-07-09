import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, onRate, readonly = false, size = 20 }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          disabled={readonly}
          onPress={() => onRate && onRate(star)}
          activeOpacity={readonly ? 1 : 0.7}
        >
          <Text style={[styles.star, { fontSize: size, color: star <= rating ? colors.accent.orange : colors.border }]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    lineHeight: 24,
  },
});
