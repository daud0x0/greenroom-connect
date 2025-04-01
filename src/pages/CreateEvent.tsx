
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import CreateEventForm from '@/components/create-event/CreateEventForm';
import contractService from '@/services/contractService';
import { useToast } from "@/hooks/use-toast";

const CreateEvent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if contract address is in .env
    const contractAddress = import.meta.env.VITE_EVENT_REGISTRATION_CONTRACT;
    const venueAddress = import.meta.env.VITE_EVENT_VENUE_CONTRACT;
    
    if (contractAddress) {
      setContractAddress(contractAddress);
      
      // Initialize the contract service with addresses
      contractService.setContractAddresses(contractAddress, venueAddress);
    } else {
      toast({
        title: "Contract Address Missing",
        description: "Please add your contract address to .env file",
        variant: "destructive",
      });
    }
  }, []);

  const handleCreateEvent = async (data: any) => {
    try {
      setIsLoading(true);
      
      if (!contractAddress) {
        toast({
          title: "Contract Not Configured",
          description: "Please set the contract address first",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      await contractService.connect();
      
      // Create the event on the blockchain
      await contractService.createEvent(
        data.name,
        data.ticketPrice,
        data.totalTickets,
        new Date(data.eventDate),
        data.allowTransfers
      );
      
      toast({
        title: "Event Created",
        description: "Your event has been created successfully",
      });
      
      navigate('/events');
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create a New Event</h1>
      <Card>
        <CardContent className="pt-6">
          <CreateEventForm onSubmit={handleCreateEvent} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEvent;
