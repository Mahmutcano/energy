import { Request, Response } from 'express';

export const getCategories = async (req: Request, res: Response) => {
    try {
        // DeviceCategory is no longer used in the new schema
        res.json([]);
    } catch (error) {
        console.error('getCategories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    res.status(501).json({ error: 'DeviceCategory not supported in current schema' });
};

export const updateCategory = async (req: Request, res: Response) => {
    res.status(501).json({ error: 'DeviceCategory not supported in current schema' });
};

export const deleteCategory = async (req: Request, res: Response) => {
    res.status(204).send();
};
