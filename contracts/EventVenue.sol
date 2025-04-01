
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./EventRegistration.sol";

/**
 * @title EventVenue
 * @dev Contract for managing event venues and special ticket types
 */
contract EventVenue is Ownable {
    struct Venue {
        uint256 id;
        string name;
        string location;
        uint256 capacity;
        bool verified;
        address owner;
    }
    
    struct TicketType {
        uint256 id;
        uint256 eventId;
        string name;
        uint256 price;
        uint256 supply;
        uint256 sold;
        bool active;
    }
    
    EventRegistration public registrationContract;
    uint256 private _venueCounter;
    uint256 private _ticketTypeCounter;
    
    // Mappings
    mapping(uint256 => Venue) public venues;
    mapping(uint256 => TicketType) public ticketTypes;
    mapping(uint256 => uint256) public eventToVenue;
    
    // Events
    event VenueAdded(uint256 venueId, string name, string location, uint256 capacity, address owner);
    event VenueVerified(uint256 venueId, bool verified);
    event TicketTypeCreated(uint256 typeId, uint256 eventId, string name, uint256 price, uint256 supply);
    event EventVenueAssigned(uint256 eventId, uint256 venueId);
    
    constructor(address registrationAddress) Ownable(msg.sender) {
        registrationContract = EventRegistration(registrationAddress);
        _venueCounter = 0;
        _ticketTypeCounter = 0;
    }
    
    /**
     * @dev Adds a new venue
     */
    function addVenue(string memory name, string memory location, uint256 capacity) public {
        _venueCounter++;
        
        venues[_venueCounter] = Venue({
            id: _venueCounter,
            name: name,
            location: location,
            capacity: capacity,
            verified: false,
            owner: msg.sender
        });
        
        emit VenueAdded(_venueCounter, name, location, capacity, msg.sender);
    }
    
    /**
     * @dev Verifies a venue (platform operators only)
     */
    function verifyVenue(uint256 venueId, bool verified) public onlyOwner {
        require(venues[venueId].id > 0, "Venue does not exist");
        venues[venueId].verified = verified;
        
        emit VenueVerified(venueId, verified);
    }
    
    /**
     * @dev Creates a new ticket type for an event
     */
    function createTicketType(
        uint256 eventId,
        string memory name,
        uint256 price,
        uint256 supply
    ) public {
        // Get event details to verify ownership
        (,,,,,,, address organizer) = registrationContract.getEvent(eventId);
        require(msg.sender == organizer, "Not event organizer");
        
        _ticketTypeCounter++;
        
        ticketTypes[_ticketTypeCounter] = TicketType({
            id: _ticketTypeCounter,
            eventId: eventId,
            name: name,
            price: price,
            supply: supply,
            sold: 0,
            active: true
        });
        
        emit TicketTypeCreated(_ticketTypeCounter, eventId, name, price, supply);
    }
    
    /**
     * @dev Assigns a venue to an event
     */
    function assignVenueToEvent(uint256 eventId, uint256 venueId) public {
        require(venues[venueId].id > 0, "Venue does not exist");
        
        // Get event details to verify ownership
        (,,,,,,, address organizer) = registrationContract.getEvent(eventId);
        require(msg.sender == organizer, "Not event organizer");
        
        eventToVenue[eventId] = venueId;
        
        emit EventVenueAssigned(eventId, venueId);
    }
    
    /**
     * @dev Gets venue details for an event
     */
    function getEventVenue(uint256 eventId) public view returns (
        uint256 id,
        string memory name,
        string memory location,
        uint256 capacity,
        bool verified,
        address owner
    ) {
        uint256 venueId = eventToVenue[eventId];
        require(venueId > 0, "No venue assigned to this event");
        
        Venue storage venue = venues[venueId];
        return (
            venue.id,
            venue.name,
            venue.location,
            venue.capacity,
            venue.verified,
            venue.owner
        );
    }
    
    /**
     * @dev Gets all ticket types for an event
     */
    function getEventTicketTypes(uint256 eventId) public view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First count matching ticket types
        for (uint256 i = 1; i <= _ticketTypeCounter; i++) {
            if (ticketTypes[i].eventId == eventId && ticketTypes[i].active) {
                count++;
            }
        }
        
        // Then populate the array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= _ticketTypeCounter; i++) {
            if (ticketTypes[i].eventId == eventId && ticketTypes[i].active) {
                result[index] = ticketTypes[i].id;
                index++;
            }
        }
        
        return result;
    }
}
