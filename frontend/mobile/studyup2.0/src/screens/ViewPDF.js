import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ViewPDF({ route }) {
  const { url } = route.params;

  return (
    <View style={{ flex: 1 }}>
      <WebView 
        source={{ uri: url }} 
        style={{ flex: 1 }} 
        startInLoadingState
        renderLoading={() => (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        )}
      />
    </View>
  );
}
