
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventRegistration
 * @dev Contract for managing event registrations and issuing NFT tickets
 */
contract EventRegistration is ERC721Enumerable, Ownable {
    // Simple counters to replace the deprecated Counters utility
    uint256 private _currentTokenId;
    uint256 private _currentEventId;

    // Event struct to store event information
    struct Event {
        uint256 eventId;
        string name;
        uint256 ticketPrice;
        uint256 totalTickets;
        uint256 ticketsSold;
        uint256 eventDate;
        bool active;
        bool allowTransfers;
        address organizer;
        uint256 proceedsWithdrawn;
    }

    // Mapping from eventId to Event
    mapping(uint256 => Event) public events;
    
    // Mapping from tokenId to eventId
    mapping(uint256 => uint256) public ticketToEvent;
    
    // Mapping from eventId to refund eligibility
    mapping(uint256 => bool) public refundEligible;
    
    // Mapping from tokenId to timestamp of purchase
    mapping(uint256 => uint256) public ticketPurchaseTime;
    
    // Mapping from tokenId to whether it has been used
    mapping(uint256 => bool) public ticketUsed;

    // Events
    event EventCreated(uint256 eventId, string name, uint256 ticketPrice, uint256 totalTickets, uint256 eventDate, address organizer);
    event TicketPurchased(uint256 eventId, address buyer, uint256 tokenId, uint256 price);
    event EventCancelled(uint256 eventId);
    event TicketRefunded(uint256 eventId, uint256 tokenId, address holder, uint256 amount);
    event TicketTransferred(uint256 tokenId, address from, address to);
    event TicketUsed(uint256 tokenId, uint256 eventId, address holder);
    event ProceedsWithdrawn(uint256 eventId, address organizer, uint256 amount);
    event RefundsEnabled(uint256 eventId);
    event TransfersToggled(uint256 eventId, bool allowed);

    constructor() ERC721("EventTicket", "EVTX") Ownable(msg.sender) {
        // Initialize counters
        _currentTokenId = 0;
        _currentEventId = 0;
    }

    /**
     * @dev Creates a new event
     * @param name Name of the event
     * @param ticketPrice Price per ticket in wei
     * @param totalTickets Maximum number of tickets available
     * @param eventDate Unix timestamp of when the event starts
     * @param allowTransfers Whether tickets can be transferred between addresses
     */
    function createEvent(
        string memory name,
        uint256 ticketPrice,
        uint256 totalTickets,
        uint256 eventDate,
        bool allowTransfers
    ) public {
        _currentEventId += 1;
        uint256 newEventId = _currentEventId;
        
        events[newEventId] = Event({
            eventId: newEventId,
            name: name,
            ticketPrice: ticketPrice,
            totalTickets: totalTickets,
            ticketsSold: 0,
            eventDate: eventDate,
            active: true,
            allowTransfers: allowTransfers,
            organizer: msg.sender,
            proceedsWithdrawn: 0
        });
        
        emit EventCreated(newEventId, name, ticketPrice, totalTickets, eventDate, msg.sender);
    }

    /**
     * @dev Allows users to purchase tickets
     * @param eventId ID of the event to purchase tickets for
     */
    function purchaseTicket(uint256 eventId) public payable {
        Event storage eventDetails = events[eventId];
        
        require(eventDetails.active, "Event is not active");
        require(block.timestamp < eventDetails.eventDate, "Event has already started");
        require(eventDetails.ticketsSold < eventDetails.totalTickets, "Event is sold out");
        require(msg.value >= eventDetails.ticketPrice, "Insufficient payment");
        
        // Mint a new NFT ticket
        _currentTokenId += 1;
        uint256 newTokenId = _currentTokenId;
        _mint(msg.sender, newTokenId);
        
        // Update ticket mapping and event details
        ticketToEvent[newTokenId] = eventId;
        eventDetails.ticketsSold += 1;
        ticketPurchaseTime[newTokenId] = block.timestamp;
        
        // Return excess payment if any
        if (msg.value > eventDetails.ticketPrice) {
            payable(msg.sender).transfer(msg.value - eventDetails.ticketPrice);
        }
        
        emit TicketPurchased(eventId, msg.sender, newTokenId, eventDetails.ticketPrice);
    }

    /**
     * @dev Cancels an event and enables refunds
     * @param eventId ID of the event to cancel
     */
    function cancelEvent(uint256 eventId) public {
        Event storage eventDetails = events[eventId];
        
        // Only organizer or contract owner can cancel event
        require(msg.sender == eventDetails.organizer || msg.sender == owner(), "Not authorized");
        require(eventDetails.active, "Event is already inactive");
        
        eventDetails.active = false;
        refundEligible[eventId] = true;
        
        emit EventCancelled(eventId);
        emit RefundsEnabled(eventId);
    }
    
    /**
     * @dev Enables refunds for an event without cancelling it
     * @param eventId ID of the event to enable refunds for
     */
    function enableRefunds(uint256 eventId) public {
        Event storage eventDetails = events[eventId];
        
        // Only organizer or contract owner can enable refunds
        require(msg.sender == eventDetails.organizer || msg.sender == owner(), "Not authorized");
        
        refundEligible[eventId] = true;
        
        emit RefundsEnabled(eventId);
    }
    
    /**
     * @dev Gets a refund for a ticket to a cancelled or refund-eligible event
     * @param tokenId ID of the ticket NFT
     */
    function getRefund(uint256 tokenId) public {
        // Fix: Use isApprovedOrOwner from ERC721 instead of _isApprovedOrOwner
        require(isApprovedOrOwner(msg.sender, tokenId), "Not ticket owner");
        
        uint256 eventId = ticketToEvent[tokenId];
        Event storage eventDetails = events[eventId];
        
        require(refundEligible[eventId], "Refunds not available");
        require(!ticketUsed[tokenId], "Ticket already used");
        
        // Mark ticket as used to prevent double refunds
        ticketUsed[tokenId] = true;
        
        // Calculate refund amount
        uint256 refundAmount = eventDetails.ticketPrice;
        
        // Transfer refund amount to ticket holder
        payable(msg.sender).transfer(refundAmount);
        
        emit TicketRefunded(eventId, tokenId, msg.sender, refundAmount);
        
        // Burn the ticket
        _burn(tokenId);
    }
    
    /**
     * @dev Allows event organizers to withdraw event proceeds
     * @param eventId ID of the event to withdraw proceeds from
     */
    function withdrawProceeds(uint256 eventId) public {
        Event storage eventDetails = events[eventId];
        
        require(msg.sender == eventDetails.organizer, "Not event organizer");
        
        // Calculate available proceeds
        uint256 totalSales = eventDetails.ticketsSold * eventDetails.ticketPrice;
        uint256 availableProceeds = totalSales - eventDetails.proceedsWithdrawn;
        
        require(availableProceeds > 0, "No proceeds available");
        
        // Update withdrawn amount
        eventDetails.proceedsWithdrawn += availableProceeds;
        
        // Transfer proceeds to organizer
        payable(msg.sender).transfer(availableProceeds);
        
        emit ProceedsWithdrawn(eventId, msg.sender, availableProceeds);
    }
    
    /**
     * @dev Toggles whether tickets can be transferred
     * @param eventId ID of the event
     * @param allowed Whether transfers are allowed
     */
    function toggleTransfers(uint256 eventId, bool allowed) public {
        Event storage eventDetails = events[eventId];
        
        require(msg.sender == eventDetails.organizer || msg.sender == owner(), "Not authorized");
        
        eventDetails.allowTransfers = allowed;
        
        emit TransfersToggled(eventId, allowed);
    }
    
    /**
     * @dev Marks a ticket as used (checked-in)
     * @param tokenId ID of the ticket NFT
     */
    function useTicket(uint256 tokenId) public {
        uint256 eventId = ticketToEvent[tokenId];
        Event storage eventDetails = events[eventId];
        
        // Only organizer or contract owner can mark tickets as used
        require(msg.sender == eventDetails.organizer || msg.sender == owner(), "Not authorized");
        require(!ticketUsed[tokenId], "Ticket already used");
        
        ticketUsed[tokenId] = true;
        
        emit TicketUsed(tokenId, eventId, ownerOf(tokenId));
    }

    /**
     * @dev Returns an event's details
     * @param eventId ID of the event
     */
    function getEvent(uint256 eventId) public view returns (
        string memory name,
        uint256 ticketPrice,
        uint256 totalTickets,
        uint256 ticketsSold,
        uint256 eventDate,
        bool active,
        bool allowTransfers,
        address organizer
    ) {
        Event storage eventDetails = events[eventId];
        return (
            eventDetails.name,
            eventDetails.ticketPrice,
            eventDetails.totalTickets,
            eventDetails.ticketsSold,
            eventDetails.eventDate,
            eventDetails.active,
            eventDetails.allowTransfers,
            eventDetails.organizer
        );
    }

    /**
     * @dev Verify if an address owns a ticket for a specific event
     * @param holder Address to check
     * @param eventId ID of the event
     * @return bool Whether the address owns a ticket
     */
    function verifyTicket(address holder, uint256 eventId) public view returns (bool) {
        uint256 balance = balanceOf(holder);
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(holder, i);
            if (ticketToEvent[tokenId] == eventId && !ticketUsed[tokenId]) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Get all tickets owned by an address for a specific event
     * @param holder Address to check
     * @param eventId ID of the event
     * @return tokenIds Array of ticket IDs
     */
    function getTicketsForEvent(address holder, uint256 eventId) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(holder);
        uint256 count = 0;
        
        // First count matching tickets
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(holder, i);
            if (ticketToEvent[tokenId] == eventId) {
                count++;
            }
        }
        
        // Then populate the array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(holder, i);
            if (ticketToEvent[tokenId] == eventId) {
                result[index] = tokenId;
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Check if a specific ticket has been used
     * @param tokenId ID of the ticket NFT
     * @return bool Whether the ticket has been used
     */
    function isTicketUsed(uint256 tokenId) public view returns (bool) {
        return ticketUsed[tokenId];
    }
    
    /**
     * @dev Check if the caller is approved or owner of the token
     * @param spender Address to check
     * @param tokenId ID of the token
     * @return bool Whether the address is approved or owner
     */
    function isApprovedOrOwner(address spender, uint256 tokenId) public view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }
    
    /**
     * @dev Override of _beforeTokenTransfer to enforce transfer restrictions
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Skip checks for minting and burning
        if (from != address(0) && to != address(0)) {
            uint256 eventId = ticketToEvent[tokenId];
            Event storage eventDetails = events[eventId];
            
            // Prevent transfers if not allowed
            require(eventDetails.allowTransfers, "Ticket transfers not allowed for this event");
            
            emit TicketTransferred(tokenId, from, to);
        }
    }
}
