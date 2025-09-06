import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, SafeAreaView } from 'react-native';

// NOTE: In a real app, these would be imported from a shared types file and an API client.
interface Contract {
  id: string;
  filename: string;
  analysis_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  negotiation_status: 'DRAFTING' | 'IN_REVIEW' | 'SIGNED' | 'ARCHIVED';
  created_at: string;
}

// Mock API function
async function fetchContracts(): Promise<Contract[]> {
  console.log("Fetching contracts for mobile...");
  // In a real app, this would call the backend:
  // const token = await getToken();
  // const response = await api.get('/contracts', { headers: { Authorization: `Bearer ${token}` } });
  // return response.data;
  return new Promise(resolve => setTimeout(() => resolve([
    { id: '1', filename: 'NDA_Vendor_A.pdf', analysis_status: 'completed', negotiation_status: 'SIGNED', created_at: new Date().toISOString() },
    { id: '2', filename: 'MSA_Client_B.docx', analysis_status: 'in_progress', negotiation_status: 'IN_REVIEW', created_at: new Date().toISOString() },
    { id: '3', filename: 'Software_License_v3.pdf', analysis_status: 'completed', negotiation_status: 'DRAFTING', created_at: new Date().toISOString() },
  ]), 1000));
}

export default function ContractsDashboardScreen({ navigation }) { // Assuming react-navigation is used
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContracts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContracts();
        setContracts(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contracts');
      } finally {
        setLoading(false);
      }
    };

    loadContracts();
  }, []);

  const renderItem = ({ item }: { item: Contract }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={() => navigation.navigate('ContractDetail', { contractId: item.id })}>
      <Text style={styles.itemTitle} numberOfLines={1}>{item.filename}</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.itemSubtitle}>Status: {item.negotiation_status}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0000ff" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={contracts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={<Text style={styles.header}>Your Contracts</Text>}
        ListEmptyComponent={<View style={styles.center}><Text>No contracts found.</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, color: '#111827' },
  itemContainer: { backgroundColor: 'white', padding: 20, marginVertical: 8, marginHorizontal: 16, borderRadius: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  statusContainer: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#E0E7FF' },
  itemSubtitle: { fontSize: 12, color: '#3730A3', fontWeight: '500' },
  errorText: { color: 'red', fontSize: 16 },
});