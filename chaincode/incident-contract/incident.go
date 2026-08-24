package main

// Incident represents a university incident stored on the blockchain.
type Incident struct {
	IncidentID     string `json:"incidentID"`
	ReporterID     string `json:"reporterID"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Category       string `json:"category"`
	Location       string `json:"location"`
	DateReported   string `json:"dateReported"`
	Priority       string `json:"priority"`
	Status         string `json:"status"`
	AssignedTo     string `json:"assignedTo"`
	Anonymous      bool   `json:"anonymous"`
	IPFSHash       string `json:"ipfsHash"`
	BlockchainHash string `json:"blockchainHash"`
	CreatedAt      string `json:"createdAt"`
	LastUpdated    string `json:"lastUpdated"`
}
