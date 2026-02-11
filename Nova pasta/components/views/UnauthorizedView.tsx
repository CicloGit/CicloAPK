
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LockClosedIcon from '../icons/LockClosedIcon';
import ArrowLeftIcon from '../icons/ArrowLeftIcon';

const UnauthorizedView: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-100">
            <div className="bg-white p-12 rounded-2xl shadow-xl border border-slate-200">
                <div className="bg-red-100 p-4 rounded-full mb-6 inline-block">
                    <LockClosedIcon className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Acesso Negado</h1>
                <p className="text-slate-600 mt-2 max-w-md">
                    Seu perfil de usuário não tem permissão para acessar este módulo. Contate o administrador do sistema se acreditar que isso é um erro.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-8 flex items-center mx-auto px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                >
                    <ArrowLeftIcon className="h-5 w-5 mr-2" />
                    Voltar para a página anterior
                </button>
            </div>
        </div>
    );
};

export default UnauthorizedView;
