import { useState, useCallback, useEffect } from 'react';
import * as umaService from '@/services/umaService';
import { BaseUma, Uma, Skill, NewUmaProfile } from '@/services/umaService';
import { toast } from 'sonner';

export const useUmas = () => {
    const [umas, setUmas] = useState<Uma[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [ base_uma, setBaseUma ] = useState<BaseUma[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUmas = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await umaService.getAllUmas();
            setUmas(data);
        } catch (err: any) {
            console.error('Failed to fetch umas: ', err);
            setError(err.message || 'Failed to load Umamusumes');
        } finally {
            setIsLoading(false);
        }

    }, []);

    useEffect(() => {
        fetchUmas();
    }, [fetchUmas]);

    const fetchMyUmas = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await umaService.getMyUmas();
            setUmas(data);
        } catch (err: any) {
            console.error('Failed to fetch umas: ', err);
            setError(err.message || 'Failed to load Umamusumes');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchSkills = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await umaService.getSkills();
            setSkills(data);
        } catch (err: any) {
            console.error('Failed to fetch skills: ', err);
            setError(err.message || 'Failed to load skills');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchBaseUmas = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try{
            const data = await umaService.getBaseUmas();
            setBaseUma(data);
        } catch (err: any) {
            console.error('Failed to fetch skills: ', err);
            setError(err.message || 'Failed to load skills');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const create = async (data: NewUmaProfile) => {
        try {
            const newUma = await umaService.createUma(data);
            setUmas((prev) => [...prev, newUma]);
            toast.success(`${newUma.name} created successfully!`);
            return true;
        } catch (err: any) {
            console.error('Create error:', err);
            console.error('Error response:', err.response?.data);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to create Uma';
            toast.error(errorMsg);
            return false;
        }
    };

    const remove = async (id: number) => {
        try {
            await umaService.deleteUma(id);
            setUmas((prev) => prev.filter((uma) => uma.id !== id));
            toast.success('Uma retired successfully');
        } catch (err: any) {
            console.error('Delete error:', err);
            toast.error('Failed to delete Uma');
        }
    };

    const update = async (id: number, data: Partial<NewUmaProfile>) => {
        try {
            const updatedUma = await umaService.updateUma(id, data);
            setUmas((prev) => prev.map((uma) => (uma.id === id ? updatedUma : uma)));
            toast.success('Uma updated successfully');
            return true;
        } catch (err: any) {
            console.error('Update error:', err);
            toast.error('Failed to update Uma');
            return false;
        }
    };

    return {
        umas,
        skills,
        base_uma,
        isLoading,
        error,
        create,
        remove,
        update,
        refresh: fetchUmas,
        fetchMyUmas,
        fetchSkills,
        fetchBaseUmas,
    };
};