import React, { useRef, useState, useEffect } from 'react';
import { 
    StyleSheet, Text, View, TouchableOpacity, Platform, StatusBar,
    Alert, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { api } from '../service/apiService';

export default function EditorPlanoAula({ route }) {
  const navigation = useNavigation();
  const planParam = route.params?.plan || {};

  const getInitialContent = () => {
    // Debug: vai mostrar no console a estrutura exata do JSON
    console.log("DEBUG PLANO COMPLETO:", JSON.stringify(planParam, null, 2));

    // 1. Tenta pegar da estrutura da IA (modules -> topics -> description)
    if (planParam.modules && planParam.modules.length > 0) {
       const firstModule = planParam.modules[0];
       if (firstModule.topics && firstModule.topics.length > 0) {
          return firstModule.topics[0].description || '';
       }
       // Caso esteja direto no módulo

       if (firstModule.description) return firstModule.description;
    }

    // 2. Tenta pegar da raiz (content ou description)
    return planParam.content || planParam.description || '';
  };

  const [title, setTitle] = useState(planParam.name || 'Novo Plano');
  const [contentHtml, setContentHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const editorRef = useRef(null); 

  // Força o carregamento do texto ao iniciar
  useEffect(() => {
    const text = getInitialContent();
    console.log("TEXTO ENCONTRADO:", text); // Debug para ver se achou
    
    setContentHtml(text);
    setTitle(planParam.name || 'Novo Plano');
    
    if (Platform.OS !== 'web' && editorRef.current) {
        editorRef.current.setContentHTML(text);
    }
  }, [planParam]);

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Erro", "O título é obrigatório.");
    
    setIsSaving(true);

    // Mantém a estrutura correta ao salvar
    const payload = {
      name: title,
      gradeLevel: planParam.gradeLevel || 'Editado',
      modules: [{
        title: 'Conteúdo Principal',
        topics: [{ title: 'Texto da Aula', description: contentHtml }]
      }]
    };

    try {
      if (planParam.id) {
        await api.put(`/api/plans/${planParam.id}`, payload);
      } else {
        await api.post('/api/plans', payload);
      }
      
      // Mensagem de sucesso
      if (Platform.OS === 'web') {
          alert('Sucesso! Alterações salvas.');
      } else {
          Alert.alert('Sucesso!', 'Plano salvo.');
      }

      navigation.navigate('ProfessorHome', { screen: 'Conteúdo' });
      
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
      setIsSaving(false); 
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        
        <TextInput 
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Título do Plano"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.editorContainer}>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.webEditor}
            multiline
            value={contentHtml} 
            onChangeText={setContentHtml}
            placeholder="O texto do plano aparecerá aqui..."
          />
        ) : (
          <>
            <RichToolbar
              editor={editorRef}
              actions={[
                actions.setBold, actions.setItalic, actions.setUnderline,
                actions.heading1, actions.insertBulletsList, actions.insertOrderedList,
                actions.undo, actions.redo,
              ]}
              iconMap={{ [actions.heading1]: () => <Text style={{fontWeight:'bold'}}>H1</Text> }}
              style={styles.toolbar}
            />
            <ScrollView style={styles.scroll} keyboardDismissMode="none">
               <RichEditor
                  ref={editorRef}
                  style={styles.editor}
                  placeholder="Escreva seu plano aqui..."
                  initialContentHTML={contentHtml}
                  onChange={setContentHtml}
               />
            </ScrollView>
          </>
        )}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', justifyContent: 'space-between' },
  titleInput: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333', marginHorizontal: 15, padding: 5, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  saveButton: { backgroundColor: '#1154D9', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  editorContainer: { flex: 1, backgroundColor: '#fff' },
  toolbar: { backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  scroll: { flex: 1 },
  editor: { flex: 1, minHeight: 300 }, 
  webEditor: { flex: 1, padding: 20, fontSize: 16, textAlignVertical: 'top', outlineStyle: 'none', height: '100%' }
});