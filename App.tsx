import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { SaleRecord, Goals } from './types';
import { fetchAndParseData } from './services/dataService';
import Header from './components/Header';
import DataLoader from './components/DataLoader';
import FilterBar from './components/FilterBar';
import KpiCards from './components/KpiCards';
import RepasseKpiCards from './components/RepasseKpiCards';
import GoalSetter from './components/GoalSetter';
import Charts from './components/Charts';

const App: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [rawData, setRawData] = useState<SaleRecord[]>([]);
    const [allSellers, setAllSellers] = useState<string[]>([]);
    const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
    const [goals, setGoals] = useState<Goals>({});

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, sellers: uniqueSellers } = await fetchAndParseData();
            setRawData(data);
            
            const newSellersSet = new Set(uniqueSellers);
            const newSellersArray = Array.from(newSellersSet);
            setAllSellers(newSellersArray);
            setSelectedSellers(newSellersArray);

            setGoals(prevGoals => {
                const newGoals = { ...prevGoals };
                newSellersArray.forEach(seller => {
                    if (newGoals[seller] === undefined) {
                        newGoals[seller] = 0;
                    }
                });
                return newGoals;
            });

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocorreu um erro desconhecido.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const filteredData = useMemo(() => {
        const selectedSellersSet = new Set(selectedSellers);
        return rawData.filter(item => selectedSellersSet.has(item.vendedor));
    }, [rawData, selectedSellers]);

    const handleSellerSelectionChange = (newSelection: string[]) => {
        setSelectedSellers(newSelection);
    };

    const handleGoalChange = (seller: string, value: number) => {
        setGoals(prev => ({ ...prev, [seller]: value }));
    };

    const handleAddSeller = (sellerName: string) => {
        if (sellerName.trim().toLowerCase() === 'repasse') {
            alert('"Repasse" não pode ser adicionado como um vendedor.');
            return;
        }
        if (sellerName && !allSellers.includes(sellerName)) {
            const newSellers = [...allSellers, sellerName];
            setAllSellers(newSellers);
            setSelectedSellers(newSellers); // Also select the new seller
            setGoals(prev => ({ ...prev, [sellerName]: 0 }));
        } else {
            alert('Este vendedor já existe ou o nome é inválido!');
        }
    };

    const handleRemoveSeller = (seller: string) => {
        if (confirm(`Tem certeza que deseja remover ${seller}?`)) {
            setAllSellers(prev => prev.filter(s => s !== seller));
            setSelectedSellers(prev => prev.filter(s => s !== seller));
            setGoals(prev => {
                const newGoals = { ...prev };
                delete newGoals[seller];
                return newGoals;
            });
        }
    };

    const topSellerData = useMemo(() => {
        const salesBySeller = filteredData.reduce((acc, item) => {
            if (item.vendedor !== 'Repasse') {
                acc[item.vendedor] = (acc[item.vendedor] || 0) + 1;
            }
            return acc;
        }, {} as { [key: string]: number });

        let topSellerName = '-';
        let topSellerCount = 0;

        for (const [seller, count] of Object.entries(salesBySeller)) {
            if (count > topSellerCount) {
                topSellerCount = count;
                topSellerName = seller;
            }
        }
        return { topSellerName, topSellerCount };
    }, [filteredData]);

    const avgStockTime = useMemo(() => {
        const validDias = filteredData.filter(item => item.dias > 0);
        return validDias.length > 0
            ? (validDias.reduce((sum, item) => sum + item.dias, 0) / validDias.length).toFixed(1)
            : '0';
    }, [filteredData]);

    const repasseData = useMemo(() => {
        // Repasse data should be calculated from rawData to be independent of seller filters
        const repasseSales = rawData.filter(item => item.vendedor === 'Repasse');
        const units = repasseSales.length;
        const revenue = repasseSales.reduce((sum, item) => sum + item.valorVenda, 0);
        const avgRevenue = units > 0 ? revenue / units : 0;

        return { units, revenue, avgRevenue };
    }, [rawData]);

    return (
        <>
            <Header onRefresh={loadData} />
            <main className="pt-20 pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="mb-8 mt-6">
                    <h1 className="text-3xl font-bold">Dashboard de Desempenho de Vendas</h1>
                    <p className="text-gray-400">Métricas e indicadores de performance da equipe comercial</p>
                </div>

                {loading || error ? (
                    <DataLoader loading={loading} error={error} onRetry={loadData} />
                ) : (
                    <div id="dashboardContent">
                        <FilterBar 
                            sellers={allSellers}
                            selectedSellers={selectedSellers}
                            onSelectionChange={handleSellerSelectionChange}
                        />
                        <KpiCards
                            topSellerName={topSellerData.topSellerName}
                            topSellerCount={topSellerData.topSellerCount}
                            avgStockTime={avgStockTime}
                        />
                        <RepasseKpiCards
                            units={repasseData.units}
                            revenue={repasseData.revenue}
                            avgRevenue={repasseData.avgRevenue}
                        />
                        <GoalSetter
                            sellers={allSellers.filter(s => s !== 'Repasse')}
                            goals={goals}
                            onGoalChange={handleGoalChange}
                            onAddSeller={handleAddSeller}
                            onRemoveSeller={handleRemoveSeller}
                        />
                        <Charts filteredData={filteredData} goals={goals} allSellers={selectedSellers} />
                    </div>
                )}
            </main>
        </>
    );
};

export default App;