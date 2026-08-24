package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing university incidents.
type SmartContract struct {
	contractapi.Contract
}

// CreateIncident creates a new incident on the blockchain.
func (s *SmartContract) CreateIncident(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
	reporterID string,
	title string,
	description string,
	category string,
	location string,
	dateReported string,
	priority string,
	anonymous bool,
	ipfsHash string,
) error {

	// Check whether the incident already exists.
	exists, err := s.IncidentExists(ctx, incidentID)
	if err != nil {
		return err
	}

	if exists {
		return fmt.Errorf("incident %s already exists", incidentID)
	}

	now := time.Now().UTC().Format(time.RFC3339)

	incident := Incident{
		IncidentID:     incidentID,
		ReporterID:     reporterID,
		Title:          title,
		Description:    description,
		Category:       category,
		Location:       location,
		DateReported:   dateReported,
		Priority:       priority,
		Status:         "Submitted",
		AssignedTo:     "",
		Anonymous:      anonymous,
		IPFSHash:       ipfsHash,
		BlockchainHash: "",
		CreatedAt:      now,
		LastUpdated:    now,
	}

	incidentJSON, err := json.Marshal(incident)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(incidentID, incidentJSON)
}

// ReadIncident retrieves an incident from the blockchain.
func (s *SmartContract) ReadIncident(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
) (*Incident, error) {

	incidentJSON, err := ctx.GetStub().GetState(incidentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read incident %s: %v", incidentID, err)
	}

	if incidentJSON == nil {
		return nil, fmt.Errorf("incident %s does not exist", incidentID)
	}

	var incident Incident

	err = json.Unmarshal(incidentJSON, &incident)
	if err != nil {
		return nil, err
	}

	return &incident, nil
}

// UpdateIncidentStatus changes the status of an incident.
func (s *SmartContract) UpdateIncidentStatus(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
	status string,
) error {

	incident, err := s.ReadIncident(ctx, incidentID)
	if err != nil {
		return err
	}

	incident.Status = status
	incident.LastUpdated = time.Now().UTC().Format(time.RFC3339)

	incidentJSON, err := json.Marshal(incident)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(incidentID, incidentJSON)
}

// AssignIncident assigns an incident to an authorized university unit or officer.
func (s *SmartContract) AssignIncident(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
	assignedTo string,
) error {

	incident, err := s.ReadIncident(ctx, incidentID)
	if err != nil {
		return err
	}

	incident.AssignedTo = assignedTo
	incident.LastUpdated = time.Now().UTC().Format(time.RFC3339)

	incidentJSON, err := json.Marshal(incident)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(incidentID, incidentJSON)
}

// UpdateIPFSHash links an incident to evidence stored in IPFS.
func (s *SmartContract) UpdateIPFSHash(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
	ipfsHash string,
) error {

	incident, err := s.ReadIncident(ctx, incidentID)
	if err != nil {
		return err
	}

	incident.IPFSHash = ipfsHash
	incident.LastUpdated = time.Now().UTC().Format(time.RFC3339)

	incidentJSON, err := json.Marshal(incident)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(incidentID, incidentJSON)
}

// UpdateBlockchainHash stores a hash used to verify incident integrity.
func (s *SmartContract) UpdateBlockchainHash(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
	blockchainHash string,
) error {

	incident, err := s.ReadIncident(ctx, incidentID)
	if err != nil {
		return err
	}

	incident.BlockchainHash = blockchainHash
	incident.LastUpdated = time.Now().UTC().Format(time.RFC3339)

	incidentJSON, err := json.Marshal(incident)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(incidentID, incidentJSON)
}

// IncidentExists checks whether an incident exists.
func (s *SmartContract) IncidentExists(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
) (bool, error) {

	incidentJSON, err := ctx.GetStub().GetState(incidentID)
	if err != nil {
		return false, err
	}

	return incidentJSON != nil, nil
}

// DeleteIncident deletes an incident from the blockchain.
func (s *SmartContract) DeleteIncident(
	ctx contractapi.TransactionContextInterface,
	incidentID string,
) error {

	exists, err := s.IncidentExists(ctx, incidentID)
	if err != nil {
		return err
	}

	if !exists {
		return fmt.Errorf("incident %s does not exist", incidentID)
	}

	return ctx.GetStub().DelState(incidentID)
}

// GetAllIncidents returns every incident stored on the ledger.
func (s *SmartContract) GetAllIncidents(
	ctx contractapi.TransactionContextInterface,
) ([]*Incident, error) {

	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}

	defer resultsIterator.Close()

	var incidents []*Incident

	for resultsIterator.HasNext() {

		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var incident Incident

		err = json.Unmarshal(queryResponse.Value, &incident)
		if err != nil {
			continue
		}

		incidents = append(incidents, &incident)
	}

	return incidents, nil
}
