
export interface SaleRecord {
    dias: number;
    valorVenda: number;
    lucroLiquido: number;
    vendedor: string;
    anoMod: string;
}

export interface Goals {
    [seller: string]: number;
}
