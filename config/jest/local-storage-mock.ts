export class LocalStorageMock implements Storage {
    private store: { [key: string]: string } = {};
    [name: string]: unknown;

    public key(index: number): string | null {
        throw new Error("Method not implemented.");
    }

    public clear(): void {
        this.store = {};
    }

    public getItem(key: string): string | null {
        return this.store[key] || null;
    }

    public setItem(key: string, value: string): void {
        this.store[key] = value;
    }

    public removeItem(key: string): void {
        delete this.store[key];
    }

    public get length(): number {
        return Object.keys(this.store).length;
    }
}

Object.defineProperty(global, "localStorage", { value: new LocalStorageMock() });
