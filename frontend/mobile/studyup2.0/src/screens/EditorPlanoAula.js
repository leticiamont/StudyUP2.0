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
  
  // Extração segura de parâmetros
  const params = route.params || {};
  const { plan = {} } = params;
  const isContent = !!params.isContent; 

  console.log("EDITOR ABERTO.");
  console.log("Modo Conteúdo?", isContent); 

  const getInitialContent = () => {
    if (isContent) {
        return plan.content || '';
    }
    if (plan.modules && plan.modules.length > 0) {
       const firstModule = plan.modules[0];
       if (firstModule.topics && firstModule.topics.length > 0) {
          return firstModule.topics[0].description || '';
       }
       return firstModule.description || '';
    }
    return plan.content || plan.description || '';
  };

  const [title, setTitle] = useState(plan.name || (isContent ? 'Novo Material' : 'Novo Plano'));
  const [contentHtml, setContentHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const editorRef = useRef(null); 

  useEffect(() => {
    const text = getInitialContent();
    setContentHtml(text);
    
    if (!plan.name) {
        setTitle(isContent ? 'Novo Material' : 'Novo Plano');
    }
    
    if (Platform.OS !== 'web' && editorRef.current) {
        setTimeout(() => {
            editorRef.current?.setContentHTML(text);
        }, 500);
    }
  }, [plan]);

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Erro", "O título é obrigatório.");
    setIsSaving(true);

    try {
      if (isContent) {
        console.log("Salvando como CONTEÚDO...");
        
        const payload = {
            name: title,
            content: contentHtml,
            type: 'text', 
            gradeLevel: plan.gradeLevel,
            schoolYear: plan.schoolYear // <--- CORRETO: OBRIGATÓRIO PARA O FILTRO
        };

        if (plan.id) {
            await api.put(`/api/contents/${plan.id}`, payload);
        } else {
            await api.post('/api/contents', payload);
        }
        
      } else {
        console.log("Salvando como PLANO...");

        const payload = {
            name: title,
            gradeLevel: plan.gradeLevel || 'Geral',
            schoolYear: plan.schoolYear, // <--- ADICIONADO AQUI TAMBÉM (IMPORTANTE)
            modules: [{
                title: 'Conteúdo Principal',
                topics: [{ title: 'Texto da Aula', description: contentHtml }]
            }]
        };
        
         if (plan.id) { 
             await api.put(`/api/plans/${plan.id}`, payload); 
         } else { 
             await api.post('/api/plans', payload); 
         }
      }
      
      Alert.alert('Sucesso!', 'Salvo com sucesso.');
      navigation.goBack();
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Não foi possível salvar.");
    } finally {
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
          placeholder="Título"
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.headerLabel, {backgroundColor: isContent ? '#E3F2FD' : '#F5F5F5'}]}>
          <Text style={{fontSize: 12, color: isContent ? '#1154D9' : '#555', fontWeight: 'bold'}}>
              {isContent ? "CRIANDO CONTEÚDO (VAI PARA A LISTA DE BAIXO)" : "EDITANDO PLANO (VAI PARA A LISTA DE CIMA)"}
          </Text>
      </View>

      <View style={styles.editorContainer}>
        {Platform.OS === 'web' ? (
          <TextInput
            style={styles.webEditor}
            multiline
            value={contentHtml} 
            onChangeText={setContentHtml}
            placeholder={isContent ? "Escreva o material para os alunos..." : "Escreva o planejamento..."}
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
              style={styles.toolbar}
            />
            <ScrollView style={styles.scroll} keyboardDismissMode="none">
               <RichEditor
                  ref={editorRef}
                  style={styles.editor}
                  placeholder="Escreva aqui..."
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
  titleInput: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333', marginHorizontal: 15, padding: 5 },
  saveButton: { backgroundColor: '#1154D9', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  headerLabel: { alignItems: 'center', paddingVertical: 5 },
  editorContainer: { flex: 1, backgroundColor: '#fff' },
  toolbar: { backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  scroll: { flex: 1 },
  editor: { flex: 1, minHeight: 300 }, 
  webEditor: { flex: 1, padding: 20, fontSize: 16, textAlignVertical: 'top', outlineStyle: 'none', height: '100%' }
});