import React, { useRef, useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    TouchableOpacity, 
    Platform, 
    StatusBar,
    Alert,
    ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';


let RNHTMLtoPDF;
if (Platform.OS !== 'web') {
  RNHTMLtoPDF = require('react-native-html-to-pdf').default;
}

export default function EditorPlanoAula({ route }) {
  const navigation = useNavigation();
  const [plan, setPlan] = useState(route.params?.plan || { name: 'Novo Plano', gradeLevel: '', content: '' });
  const editorRef = useRef(null); 
  const [contentHtml, setContentHtml] = useState(plan.content || '');

  // 7. Função para salvar (chama a API)
  const handleSave = async () => {
    Alert.alert('Salvo!', 'O seu plano de aula foi guardado.');
    console.log(contentHtml);
  };


  const handleExportPdf = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Não suportado', 'A exportação de PDF não é suportada no modo Web.');
      return;
    }

    try {
      const options = {
        html: `<h1>${plan.name}</h1>${contentHtml}`,
        fileName: `${plan.name.replace(' ', '_')}`,
        directory: 'Documents',
      };
      const file = await RNHTMLtoPDF.convert(options);
      Alert.alert('Sucesso', `PDF salvo em: ${file.filePath}`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar o PDF.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      {/* 1. CABEÇALHO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{plan.name}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
          <Text style={styles.headerButtonText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      {/* 2. BARRA DE FERRAMENTAS "TIPO WORD" */}
      <RichToolbar
        editor={editorRef}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.setUnderline,
          actions.insertBulletsList,
          actions.insertOrderedList,
          actions.insertLink,
          actions.keyboard,
        ]}
        iconMap={{
          [actions.keyboard]: () => <MaterialCommunityIcons name="keyboard-off" size={24} color="#333" />,
        }}
        style={styles.toolbar}
      />

      {/* 3. O EDITOR */}
      <ScrollView style={styles.editorScroll}>
        <RichEditor
          ref={editorRef}
          style={styles.editor} 
          placeholder="Comece a escrever o seu plano de aula aqui..."
          initialContentHTML={contentHtml} 
          onChange={html => setContentHtml(html)} 
        />
      </ScrollView>
      
      {/* 4. BOTÃO DE EXPORTAR PDF */}
      {/* Só mostra o botão se NÃO for web */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity style={styles.pdfButton} onPress={handleExportPdf}>
          <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />
          <Text style={styles.pdfButtonText}>Exportar para PDF</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerButton: { backgroundColor: '#1154D9', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5 },
  headerButtonText: { color: '#fff', fontWeight: 'bold' },
  
  // Estilos do Editor
  toolbar: {
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editorScroll: {
    flex: 1,
  },
  editor: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  
  // Botão PDF
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D32F2F', // Cor de PDF (vermelho)
    paddingVertical: 15,
  },
  pdfButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
});