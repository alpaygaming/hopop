import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle, Platform, PressableProps } from 'react-native';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({ onPress, children, style, disabled, ...props }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const useNative = Platform.OS !== 'web';

  const handlePressIn = (e: any) => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.90, useNativeDriver: useNative, speed: 20 }),
      Animated.timing(opacity, { toValue: 0.6, duration: 100, useNativeDriver: useNative }),
    ]).start();
    if (props.onPressIn) props.onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: useNative, friction: 4, tension: 40 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: useNative }),
    ]).start();
    if (props.onPressOut) props.onPressOut(e);
  };

  return (
    <AnimatedPressableComponent
      {...props}
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[style, { transform: [{ scale }], opacity: disabled ? 0.5 : opacity } as any]}
    >
      {children}
    </AnimatedPressableComponent>
  );
};
