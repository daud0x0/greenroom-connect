import { ethers } from 'ethers';

// Using a dynamic import for the contract artifact since it might not exist during build time
// We'll provide a placeholder structure for TypeScript
const EventRegistrationArtifact = {
  abi: [] // This will be populated at runtime
};

const EventVenueArtifact = {
  abi: [] // This will be populated at runtime
};

export interface EventDetails {
  eventId: number;
  name: string;
  ticketPrice: string;
  totalTickets: number;
  ticketsSold: number;
  eventDate: Date;
  active: boolean;
  allowTransfers: boolean;
  organizer: string;
}

export interface VenueDetails {
  venueId: number;
  name: string;
  location: string;
  capacity: number;
  verified: boolean;
  owner: string;
}

export interface TicketTypeDetails {
  id: number;
  eventId: number;
  name: string;
  price: string;
  supply: number;
  sold: number;
  active: boolean;
}

export class ContractService {
  private provider: ethers.BrowserProvider;
  private signer: ethers.Signer | null = null;
  private registrationContract: ethers.Contract | null = null;
  private venueContract: ethers.Contract | null = null;
  private registrationAddress: string | null = null;
  private venueAddress: string | null = null;
  
  constructor(registrationAddress?: string, venueAddress?: string) {
    if (window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      if (registrationAddress) {
        this.registrationAddress = registrationAddress;
      }
      if (venueAddress) {
        this.venueAddress = venueAddress;
      }
    } else {
      throw new Error('Ethereum provider not found. Please install MetaMask.');
    }
  }

  async loadContractArtifact(contractName: string) {
    try {
      // Try to fetch the artifact from the public folder
      const response = await fetch(`/artifacts/contracts/${contractName}.sol/${contractName}.json`);
      if (response.ok) {
        return await response.json();
      } else {
        console.error(`Failed to load contract artifact for ${contractName} from public folder`);
        return { abi: [] };
      }
    } catch (error) {
      console.error(`Error loading ${contractName} artifact:`, error);
      return { abi: [] };
    }
  }

  async connect(): Promise<string> {
    try {
      this.signer = await this.provider.getSigner();
      
      if (this.registrationAddress && this.signer) {
        // Load the contract ABIs dynamically
        const registrationArtifact = await this.loadContractArtifact('EventRegistration');
        
        this.registrationContract = new ethers.Contract(
          this.registrationAddress,
          registrationArtifact.abi,
          this.signer
        );
      }
      
      if (this.venueAddress && this.signer) {
        const venueArtifact = await this.loadContractArtifact('EventVenue');
        
        this.venueContract = new ethers.Contract(
          this.venueAddress,
          venueArtifact.abi,
          this.signer
        );
      }
      
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  }

  async getUserENSName(address: string): Promise<string | null> {
    try {
      // Try to resolve ENS name for the address
      const ensName = await this.provider.lookupAddress(address);
      return ensName;
    } catch (error) {
      console.error('Error getting ENS name:', error);
      return null;
    }
  }

  async getUserAvatar(address: string): Promise<string | null> {
    try {
      // First check if the address has an ENS name
      const ensName = await this.provider.lookupAddress(address);
      
      if (ensName) {
        // Try to get avatar from ENS
        const resolver = await this.provider.getResolver(ensName);
        if (resolver) {
          const avatar = await resolver.getText('avatar');
          if (avatar) return avatar;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user avatar:', error);
      return null;
    }
  }

  async createEvent(
    name: string,
    ticketPrice: string,
    totalTickets: number,
    eventDate: Date,
    allowTransfers: boolean = true
  ): Promise<any> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const priceInWei = ethers.parseEther(ticketPrice);
      const timestampInSeconds = Math.floor(eventDate.getTime() / 1000);
      
      const tx = await this.registrationContract.createEvent(
        name,
        priceInWei,
        totalTickets,
        timestampInSeconds,
        allowTransfers
      );
      
      return await tx.wait();
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async purchaseTicket(eventId: number, price: string): Promise<any> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const priceInWei = ethers.parseEther(price);
      const tx = await this.registrationContract.purchaseTicket(eventId, {
        value: priceInWei
      });
      
      return await tx.wait();
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      throw error;
    }
  }
  
  async cancelEvent(eventId: number): Promise<any> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const tx = await this.registrationContract.cancelEvent(eventId);
      return await tx.wait();
    } catch (error) {
      console.error('Error cancelling event:', error);
      throw error;
    }
  }
  
  async getRefund(tokenId: number): Promise<any> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const tx = await this.registrationContract.getRefund(tokenId);
      return await tx.wait();
    } catch (error) {
      console.error('Error getting refund:', error);
      throw error;
    }
  }
  
  async withdrawProceeds(eventId: number): Promise<any> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const tx = await this.registrationContract.withdrawProceeds(eventId);
      return await tx.wait();
    } catch (error) {
      console.error('Error withdrawing proceeds:', error);
      throw error;
    }
  }
  
  async useTicket(tokenId: number): Promise<any> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const tx = await this.registrationContract.useTicket(tokenId);
      return await tx.wait();
    } catch (error) {
      console.error('Error using ticket:', error);
      throw error;
    }
  }

  async getEvent(eventId: number): Promise<EventDetails> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const event = await this.registrationContract.getEvent(eventId);
      
      return {
        eventId,
        name: event[0],
        ticketPrice: ethers.formatEther(event[1]),
        totalTickets: Number(event[2]),
        ticketsSold: Number(event[3]),
        eventDate: new Date(Number(event[4]) * 1000),
        active: event[5],
        allowTransfers: event[6],
        organizer: event[7]
      };
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }

  async verifyTicket(holderAddress: string, eventId: number): Promise<boolean> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      return await this.registrationContract.verifyTicket(holderAddress, eventId);
    } catch (error) {
      console.error('Error verifying ticket:', error);
      throw error;
    }
  }
  
  async getTicketsForEvent(holderAddress: string, eventId: number): Promise<number[]> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      const tickets = await this.registrationContract.getTicketsForEvent(holderAddress, eventId);
      return tickets.map((ticket: bigint) => Number(ticket));
    } catch (error) {
      console.error('Error getting tickets:', error);
      throw error;
    }
  }
  
  async isTicketUsed(tokenId: number): Promise<boolean> {
    if (!this.registrationContract) {
      throw new Error('Contract not initialized');
    }
    
    try {
      return await this.registrationContract.isTicketUsed(tokenId);
    } catch (error) {
      console.error('Error checking if ticket is used:', error);
      throw error;
    }
  }
  
  async addVenue(name: string, location: string, capacity: number): Promise<any> {
    if (!this.venueContract) {
      throw new Error('Venue contract not initialized');
    }
    
    try {
      const tx = await this.venueContract.addVenue(name, location, capacity);
      return await tx.wait();
    } catch (error) {
      console.error('Error adding venue:', error);
      throw error;
    }
  }
  
  async createTicketType(eventId: number, name: string, price: string, supply: number): Promise<any> {
    if (!this.venueContract) {
      throw new Error('Venue contract not initialized');
    }
    
    try {
      const priceInWei = ethers.parseEther(price);
      const tx = await this.venueContract.createTicketType(eventId, name, priceInWei, supply);
      return await tx.wait();
    } catch (error) {
      console.error('Error creating ticket type:', error);
      throw error;
    }
  }
  
  async assignVenueToEvent(eventId: number, venueId: number): Promise<any> {
    if (!this.venueContract) {
      throw new Error('Venue contract not initialized');
    }
    
    try {
      const tx = await this.venueContract.assignVenueToEvent(eventId, venueId);
      return await tx.wait();
    } catch (error) {
      console.error('Error assigning venue to event:', error);
      throw error;
    }
  }
  
  async getEventVenue(eventId: number): Promise<VenueDetails> {
    if (!this.venueContract) {
      throw new Error('Venue contract not initialized');
    }
    
    try {
      const venue = await this.venueContract.getEventVenue(eventId);
      
      return {
        venueId: Number(venue[0]),
        name: venue[1],
        location: venue[2],
        capacity: Number(venue[3]),
        verified: venue[4],
        owner: venue[5]
      };
    } catch (error) {
      console.error('Error getting event venue:', error);
      throw error;
    }
  }
  
  async getEventTicketTypes(eventId: number): Promise<number[]> {
    if (!this.venueContract) {
      throw new Error('Venue contract not initialized');
    }
    
    try {
      const types = await this.venueContract.getEventTicketTypes(eventId);
      return types.map((type: bigint) => Number(type));
    } catch (error) {
      console.error('Error getting event ticket types:', error);
      throw error;
    }
  }

  async setContractAddresses(registrationAddress: string, venueAddress?: string): Promise<void> {
    this.registrationAddress = registrationAddress;
    
    if (venueAddress) {
      this.venueAddress = venueAddress;
    }
    
    if (this.signer) {
      // Load the contract ABIs dynamically
      const registrationArtifact = await this.loadContractArtifact('EventRegistration');
      
      this.registrationContract = new ethers.Contract(
        registrationAddress,
        registrationArtifact.abi,
        this.signer
      );
      
      if (venueAddress) {
        const venueArtifact = await this.loadContractArtifact('EventVenue');
        
        this.venueContract = new ethers.Contract(
          venueAddress,
          venueArtifact.abi,
          this.signer
        );
      }
    }
  }
}

export const contractService = new ContractService();
export default contractService;
