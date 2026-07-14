import React from "react";
import { PAGINATION_CONFIG } from "./configuracion";

interface PaginacionProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    isLoading: boolean;
    onPageChange: (page: number) => void;

    /**
     * Conservado temporalmente para no romper las pantallas que todavía
     * envían esta propiedad. Ya no se muestra ningún selector de filas.
     * Puede eliminarse de los componentes consumidores cuando se actualicen.
     */
    onItemsPerPageChange?: (limit: number) => void;
}

export function Paginacion({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    isLoading,
    onPageChange
}: PaginacionProps) {
    const inicio = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const fin = Math.min(totalItems, currentPage * itemsPerPage);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-black/20 border-t border-border-table text-xs text-zinc-400 gap-4">
            <div>
                {PAGINATION_CONFIG.labels.showing} {inicio}{" "}
                {PAGINATION_CONFIG.labels.to} {fin}{" "}
                {PAGINATION_CONFIG.labels.of} {totalItems}{" "}
                {PAGINATION_CONFIG.labels.records}
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                    {PAGINATION_CONFIG.labels.previous}
                </button>

                <span className="px-3 py-1.5 bg-zinc-900 border border-white/5 rounded text-white font-medium">
                    {PAGINATION_CONFIG.labels.page} {currentPage}{" "}
                    {PAGINATION_CONFIG.labels.of} {Math.max(totalPages, 1)}
                </span>

                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                    {PAGINATION_CONFIG.labels.next}
                </button>
            </div>
        </div>
    );
}
