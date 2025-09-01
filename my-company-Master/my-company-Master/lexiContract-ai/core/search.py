import chromadb
from sentence_transformers import SentenceTransformer
import uuid

class SearchService:
    def __init__(self):
        try:
            # Using a persistent client that connects to the ChromaDB server.
            # The host name 'chroma' matches the service name in docker-compose.yml.
            self.chroma_client = chromadb.HttpClient(host='chroma', port=8000)
            
            # Ensure the collection exists. This is idempotent.
            self.collection = self.chroma_client.get_or_create_collection(name="contracts")
            
            # Load a pre-trained model optimized for semantic search.
            # This model will be downloaded on first run.
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            print("SearchService initialized successfully.")
        except Exception as e:
            print(f"CRITICAL: Failed to initialize SearchService: {e}")
            self.chroma_client = None
            self.model = None

    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        """Splits text into paragraphs as a simple chunking strategy."""
        paragraphs = text.split('\n\n')
        return [p.strip() for p in paragraphs if p.strip()]

    def index_document(self, contract_id: str, version_id: str, organization_id: str, text: str):
        if not self.chroma_client or not self.model:
            print("SearchService is not available. Skipping document indexing.")
            return

        chunks = self._chunk_text(text)
        if not chunks:
            return

        embeddings = self.model.encode(chunks).tolist()
        metadata = [{
            "contract_id": contract_id,
            "version_id": version_id,
            "organization_id": organization_id
        } for _ in chunks]
        
        # Generate unique IDs for each chunk
        ids = [str(uuid.uuid4()) for _ in chunks]

        self.collection.add(embeddings=embeddings, documents=chunks, metadatas=metadata, ids=ids)
        print(f"Successfully indexed {len(chunks)} chunks for contract {contract_id}.")

    def semantic_search(self, query_text: str, organization_id: str, limit: int = 10) -> list[dict]:
        if not self.chroma_client or not self.model:
            print("SearchService is not available. Cannot perform search.")
            return []

        query_embedding = self.model.encode([query_text]).tolist()
        
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=limit,
            where={"organization_id": organization_id}
        )

        # The query returns lists of lists, one for each query embedding. We only have one.
        ids = results['ids'][0]
        documents = results['documents'][0]
        metadatas = results['metadatas'][0]
        distances = results['distances'][0] # Chroma's distance is a measure of similarity

        return [{"id": id, "snippet": doc, "metadata": meta, "score": 1 - dist} for id, doc, meta, dist in zip(ids, documents, metadatas, distances)]

# Create a single, shared instance of the service
search_service = SearchService()