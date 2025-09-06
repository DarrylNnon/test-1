import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';

// NOTE: In a real app, these would be imported from a shared types file and an API client.
interface ContractMilestone {
  id: string;
  milestone_type: string;
  milestone_date: string;
}

interface TrackedObligation {
  id: string;
  obligation_text: string;
  status: 'Pending' | 'Completed';
}

interface ContractDetail {
  id: string;
  filename: string;
  negotiation_status: 'DRAFTING' | 'IN_REVIEW' | 'SIGNED' | 'ARCHIVED';
  milestones: ContractMilestone[];
  obligations: TrackedObligation[];
}

// Mock API function
async function fetchContractDetails(contractId: string): Promise<ContractDetail> {
  console.log(`Fetching details for contract ${contractId}...`);
  // In a real app, this would call the backend:
  // const token = await getToken();
  // const response = await api.get(`/contracts/${contractId}`, { headers: { Authorization: `Bearer ${token}` } });
  // return response.data;
  return new Promise(resolve => setTimeout(() => resolve({
    id: contractId,
    filename: 'MSA_Client_B.docx',
    negotiation_status: 'IN_REVIEW',
    milestones: [
      { id: 'm1', milestone_type: 'Effective Date', milestone_date: '2023-10-01' },
      { id: 'm2', milestone_type: 'Renewal Notice Deadline', milestone_date: '2024-07-03' },
      { id: 'm3', milestone_type: 'Expiration Date', milestone_date: '2024-09-30' },
    ],
    obligations: [
      { id: 'o1', obligation_text: 'Client shall provide security audit report within 30 days.', status: 'Pending' },
      { id: 'o2', obligation_text: 'Vendor shall complete data migration by Q4.', status: 'Pending' },
    ],
  }), 800));
}

export default function ContractDetailScreen({ route }) { // Assuming react-navigation is used
  const { contractId } = route.params;
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContractDetails(contractId);
        setContract(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contract details');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [contractId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0000ff" /></View>;
  }

  if (error || !contract) {
    return <View style={styles.center}><Text style={styles.errorText}>{error || 'Contract not found.'}</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{contract.filename}</Text>
          <Text style={styles.headerStatus}>Status: {contract.negotiation_status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Milestones</Text>
          {contract.milestones.map(item => (
            <View key={item.id} style={styles.card}><Text style={styles.cardTitle}>{item.milestone_type}</Text><Text style={styles.cardText}>{new Date(item.milestone_date).toLocaleDateString()}</Text></View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracked Obligations</Text>
          {contract.obligations.map(item => (
            <View key={item.id} style={styles.card}><Text style={styles.cardText}>{item.obligation_text}</Text></View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  headerStatus: { fontSize: 16, color: '#4B5563' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  card: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  cardText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  errorText: { color: 'red', fontSize: 16 },
});