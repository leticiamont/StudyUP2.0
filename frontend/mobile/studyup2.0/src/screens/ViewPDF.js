import React from 'react';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ViewPDF({ route }) {
  const { url } = route.params;

  // 1. MODO WEB (Navegador)
  // Liberoando no Cloudinary, o iframe.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe 
          src={url} 
          style={{ width: '100%', height: '100%', border: 'none' }} 
          title="PDF Viewer"
        />
      </View>
    );
  }

  // 2. MODO MOBILE (Android / iOS)
  
  // Android: O WebView nativo NÃO abre PDF sozinho. Precisamos do Google Viewer.
  // iOS: O WebView nativo abre PDF perfeitamente.
  
  const isAndroid = Platform.OS === 'android';
  
  // Se for Android, usa o Google. Se for iOS, usa o link direto.
  const finalUrl = isAndroid 
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`
    : url;

  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: finalUrl }} 
        style={{ flex: 1 }} 
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator size="large" color="#1154D9" style={styles.loader} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18, 
    marginTop: -18
  }
});