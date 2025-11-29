import React from 'react';
import { View, ActivityIndicator, Platform, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

export default function ViewPDF({ route }) {
  const { url } = route.params;

  if (!url) {
    return (
        <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}>
            <Text>Erro: URL do PDF inválida.</Text>
        </View>
    );
  }

  // O Visualizador do Google transforma o PDF em uma página Web navegável.
  // Isso evita que o navegador force o download do arquivo.
  const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  // 1. MODO WEB (Navegador)
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe 
          src={googleViewerUrl} // <--- MUDANÇA: Usa o Google Viewer no iframe
          style={{ width: '100%', height: '100%', border: 'none' }} 
          title="PDF Viewer"
        />
      </View>
    );
  }

  // 2. MODO MOBILE (Android / iOS)
  
  // Android: O WebView nativo não abre PDF direto, precisa do Google Viewer.
  // iOS: O WebView nativo (WKWebView) abre PDF nativamente, então usamos a URL direta.
  const finalUrl = Platform.OS === 'android' ? googleViewerUrl : url;

  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: finalUrl }} 
        style={{ flex: 1 }} 
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator size="large" color="#1154D9" style={styles.loader} />
        )}
        originWhitelist={['*']}
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
    marginTop: -18,
    zIndex: 99
  }
});