import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle, Platform } from 'react-native';

interface AnimatedPressableProps {
  onPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({ onPress, children, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  // Web sometimes struggles with native driver for spring, making it false is safer for now
  const useNative = Platform.OS !== 'web';

  const handlePressIn = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.90, useNativeDriver: useNative, speed: 20 }),
      Animated.timing(opacity, { toValue: 0.6, duration: 100, useNativeDriver: useNative }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: useNative, friction: 4, tension: 40 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: useNative }),
    ]).start();
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[style, { transform: [{ scale }], opacity: opacity }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};
