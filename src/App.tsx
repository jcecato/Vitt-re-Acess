/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginScreen } from './auth/LoginScreen';
import { PhoneShell } from './components/layout/PhoneShell';
import { CoverScreen } from './components/layout/CoverScreen';
import { PatientHeader } from './components/layout/PatientHeader';
import { NavigationRail } from './components/layout/NavigationRail';
import { DotsIndicator } from './components/layout/DotsIndicator';

// Modular Clinical Tabs
import { DashboardTab } from './modules/dashboard/DashboardTab';
import { EvolutionTab } from './modules/evolution/EvolutionTab';
import { ConsultationsTab } from './modules/consultations/ConsultationsTab';
import { ExamsTab } from './modules/exams/ExamsTab';
import { PhysicalAssessmentTab } from './modules/physical-assessment/PhysicalAssessmentTab';
import { MealGuideTab } from './modules/meal-guide/MealGuideTab';
import { MetabolicProfileTab } from './modules/metabolic-profile/MetabolicProfileTab';
import { ProtocolTab } from './modules/protocol/ProtocolTab';
import { MarketplaceTab } from './modules/marketplace/MarketplaceTab';
import { GuiasTab } from './modules/guias/GuiasTab';
import { FinancialTab } from './modules/financial/FinancialTab';
import { TermsTab } from './modules/terms/TermsTab';
import { SurpriseBoxTab } from './modules/surprise-box/SurpriseBoxTab';

// Modals
import { PdfViewerModal } from './components/common/PdfViewerModal';
import { RescheduleModal } from './components/common/RescheduleModal';

// Services
import { crmDataService } from './services/crmDataService';

function PatientAppContent() {
  const { currentPatient, isAuthenticated } = useAuth();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('inicio');
  const [showCover, setShowCover] = useState<boolean>(true);

  // Modal States
  const [pdfModal, setPdfModal] = useState<{ isOpen: boolean; title: string }>({
    isOpen: false,
    title: ''
  });

  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);

  // Handlers
  const handleOpenPdf = (title: string) => {
    setPdfModal({ isOpen: true, title });
  };

  const handleConfirmReschedule = async (newDateStr: string) => {
    if (!currentPatient) return;
    await crmDataService.updatePatient(currentPatient.id, {
      nextConsultationDate: newDateStr,
      consultations: currentPatient.consultations.map(c => 
        c.status === 'agendada' ? { ...c, dateStr: newDateStr } : c
      )
    }, 'Remarcação pelo Aplicativo do Paciente');
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    // Reconhece e baixa a notificação assim que a aba é aberta pelo paciente
    if (tabId !== 'inicio' && currentPatient) {
      crmDataService.acknowledgeTabUpdate(currentPatient.id, tabId);
      if (tabId === 'guias') {
        crmDataService.acknowledgeTabUpdate(currentPatient.id, 'docs');
        crmDataService.acknowledgeTabUpdate(currentPatient.id, 'saude');
        crmDataService.acknowledgeTabUpdate(currentPatient.id, 'encam');
      }
    }
  };

  const rawPendingTabs = currentPatient 
    ? crmDataService.getPendingUpdates(currentPatient).map(u => u.tab) 
    : [];
  const pendingTabs = [...rawPendingTabs];
  if (rawPendingTabs.some(t => ['guias', 'docs', 'saude', 'encam'].includes(t))) {
    if (!pendingTabs.includes('guias')) pendingTabs.push('guias');
  }

  // Se o paciente não estiver autenticado na sessão individual, exibe tela de login/PIN
  if (!isAuthenticated || !currentPatient) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#07070d] p-0 sm:py-3 sm:px-4 flex flex-col items-center justify-center">
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#07070d] p-0 sm:py-3 sm:px-4 flex flex-col items-center justify-center text-white">
      
      {/* Estrutura Principal do Smartphone (Mobile First, adaptativa à largura de cada aparelho 6.1" a 7.0") */}
      <PhoneShell>
        
        {/* Capa Inicial (Sem transbordo, travada 100% no viewport) */}
        <CoverScreen
          isVisible={showCover}
          onEnter={() => setShowCover(false)}
        />

        {/* Conteúdo Clínico do Paciente (Oculto sob a capa até o clique em Entrar) */}
        <div className={`flex-1 w-full h-full flex flex-col min-h-0 overflow-hidden transition-opacity duration-300 ${
          showCover ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Header Exclusivo do Paciente (exibido apenas na aba Início para liberar espaço máximo nas demais) */}
          {activeTab === 'inicio' && (
            <div className="shrink-0">
              <PatientHeader
                patient={currentPatient}
                activeTab={activeTab}
              />
            </div>
          )}

          {/* Barra de Navegação Horizontal com 13 Abas + Indicador de Atualizações Pendentes */}
          <div className="shrink-0">
            <NavigationRail
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              pendingTabs={pendingTabs}
            />
          </div>

          {/* Container das Telas (altura adaptativa inteligente via flex-1 para qualquer celular de 6.1 a 7.0) */}
          <div 
            id="scr" 
            className="flex-1 min-h-0 overflow-y-auto no-scrollbar scroll-smooth w-full px-3 sm:px-4 pt-1.5 pb-2"
          >
          {activeTab === 'inicio' && (
            <DashboardTab
              patient={currentPatient}
              onNavigateTab={handleSelectTab}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'evolucao' && (
            <EvolutionTab patient={currentPatient} />
          )}

          {activeTab === 'consultas' && (
            <ConsultationsTab
              patient={currentPatient}
              onOpenReschedule={() => setIsRescheduleOpen(true)}
            />
          )}

          {activeTab === 'exames' && (
            <ExamsTab
              patient={currentPatient}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'avaliacao' && (
            <PhysicalAssessmentTab
              patient={currentPatient}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'guia' && (
            <MealGuideTab
              patient={currentPatient}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'perfil-metabolico' && (
            <MetabolicProfileTab
              patient={currentPatient}
            />
          )}

          {activeTab === 'protocolo' && (
            <ProtocolTab
              patient={currentPatient}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'marketplace' && (
            <MarketplaceTab patient={currentPatient} />
          )}

          {(activeTab === 'guias' || activeTab === 'docs' || activeTab === 'saude' || activeTab === 'encam') && (
            <GuiasTab
              patient={currentPatient}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'termos' && (
            <TermsTab
              patient={currentPatient}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinancialTab
              patient={currentPatient}
              onOpenPdf={handleOpenPdf}
            />
          )}

          {activeTab === 'caixa-surpresa' && (
            <SurpriseBoxTab
              patient={currentPatient}
            />
          )}
        </div>

        {/* Indicador de Bolinhas e Botão Voltar Início */}
        <div className="shrink-0">
          <DotsIndicator
            activeTab={activeTab}
            onGoToInicio={() => handleSelectTab('inicio')}
          />
        </div>

      </div>
      </PhoneShell>

      {/* Modais do Aplicativo do Paciente */}
      <PdfViewerModal
        isOpen={pdfModal.isOpen}
        title={pdfModal.title}
        patientName={currentPatient.name}
        onClose={() => setPdfModal({ isOpen: false, title: '' })}
      />

      <RescheduleModal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        onConfirm={handleConfirmReschedule}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PatientAppContent />
    </AuthProvider>
  );
}
