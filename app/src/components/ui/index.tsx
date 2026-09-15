import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacityProps, 
  TextInputProps,
  ViewProps,
  ViewStyle,
  StyleProp
} from 'react-native';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

// ==========================================
// 1. BUTTON COMPONENT
// ==========================================
export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  style,
  ...props
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary': return styles.secondaryContainer;
      case 'outline': return styles.outlineContainer;
      default: return styles.primaryContainer;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
      case 'outline': return styles.secondaryText;
      default: return styles.primaryText;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.buttonContainer, getContainerStyle(), style]}
      activeOpacity={0.8}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.surface : Colors.primary} />
      ) : (
        <>
          {leftIcon}
          <Text style={[styles.buttonText, getTextStyle(), leftIcon ? styles.textWithIcon : null]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ==========================================
// 2. INPUT COMPONENT
// ==========================================
export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  isPassword,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  return (
    <View style={styles.inputWrapper}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        error ? styles.inputError : null,
      ]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            (rightIcon || isPassword) ? styles.inputWithRightIcon : null,
            style
          ]}
          placeholderTextColor={Colors.textSecondary}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {isPassword ? (
          <TouchableOpacity 
            style={styles.rightIcon} 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {isPasswordVisible ? (
              <Eye color={Colors.textSecondary} size={20} />
            ) : (
              <EyeOff color={Colors.textSecondary} size={20} />
            )}
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.rightIcon}>{rightIcon}</View>
        ) : null}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// ==========================================
// 3. CARD COMPONENT
// ==========================================
export interface CardProps extends ViewProps {
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  style,
  ...props
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return 12;
      case 'md': return 20;
      case 'lg': return 24;
      default: return 20;
    }
  };

  const baseStyle: ViewStyle = {
    padding: getPadding(),
    borderRadius: Radius.lg,
  };

  if (variant === 'glass') {
    return (
      <BlurView intensity={40} tint="light" style={[styles.glassContainer, baseStyle, style]} {...props as any}>
        {children}
      </BlurView>
    );
  }

  const variantStyles = {
    default: {
      backgroundColor: Colors.card,
      ...Shadows.soft,
    },
    elevated: {
      backgroundColor: Colors.card,
      ...Shadows.glass,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: Colors.border,
    },
  };

  return (
    <View style={[styles.cardContainer, variantStyles[variant], baseStyle, style]} {...props}>
      {children}
    </View>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  // Button Styles
  buttonContainer: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  primaryContainer: {
    backgroundColor: Colors.primary,
  },
  secondaryContainer: {
    backgroundColor: Colors.secondary,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: Colors.surface,
  },
  secondaryText: {
    color: Colors.primary,
  },
  textWithIcon: {
    marginLeft: 12,
  },

  // Input Styles
  inputWrapper: {
    marginBottom: 16,
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    height: 56,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: 44,
  },
  inputWithRightIcon: {
    paddingRight: 44,
  },
  leftIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },

  // Card Styles
  cardContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  glassContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
  },
});
