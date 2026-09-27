import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { EventDetailPage } from './pages/EventDetailPage.tsx';
import { GalleryPage } from './pages/GalleryPage.tsx';
import { ProjectDetailPage } from './pages/ProjectDetailPage.tsx';
import { TeamDashboardPage } from './pages/TeamDashboardPage.tsx';
import { SubmitPage } from './pages/SubmitPage.tsx';
import { JudgeDashboardPage } from './pages/JudgeDashboardPage.tsx';
import { JudgeEvaluatePage } from './pages/JudgeEvaluatePage.tsx';
import { JudgePairwisePage } from './pages/JudgePairwisePage.tsx';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage.tsx';
import { ResultsPage } from './pages/ResultsPage.tsx';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage.tsx';
import { ApiDocsPage } from './pages/ApiDocsPage.tsx';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage.tsx';
import { TermsPage } from './pages/TermsPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { EmbedWidget } from './components/gallery/EmbedWidget.tsx';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Standalone Embed Routes (no platform header/footer) */}
      <Route path="embed/gallery/:eventId" element={<EmbedWidget />} />
      <Route path="embed/gallery/:eventSlug" element={<EmbedWidget />} />

      {/* Main Platform Routes with Layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="event/:slugOrId" element={<EventDetailPage />} />
        <Route path="gallery/:eventSlug" element={<GalleryPage />} />
        <Route path="project/:id" element={<ProjectDetailPage />} />
        <Route path="dashboard/team/:eventSlug" element={<TeamDashboardPage />} />
        <Route path="submit/:eventSlug" element={<SubmitPage />} />
        <Route path="dashboard/judge/:eventSlug" element={<JudgeDashboardPage />} />
        <Route path="evaluate/:eventSlug/:projectId" element={<JudgeEvaluatePage />} />
        <Route path="dashboard/pairwise/:eventSlug" element={<JudgePairwisePage />} />
        <Route path="dashboard/organizer/:eventSlug" element={<OrganizerDashboardPage />} />
        <Route path="results/:eventSlug" element={<ResultsPage />} />
        <Route path="verify" element={<CertificateVerifyPage />} />
        <Route path="api-docs" element={<ApiDocsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="privacy" element={<PrivacyPolicyPage />} />
        <Route path="terms" element={<TermsPage />} />
        {/* Catch-all: renders a proper 404 page instead of a blank screen */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
