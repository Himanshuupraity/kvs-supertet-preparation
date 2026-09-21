import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useUserStore } from '@/store/useUserStore';
import { Skeleton } from '@/components/ui';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

const HomePage = lazy(() => import('@/pages/HomePage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const StudyPlanPage = lazy(() => import('@/pages/StudyPlanPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SourcesPage = lazy(() => import('@/pages/SourcesPage'));

const SuperTetDashboard = lazy(() => import('@/pages/supertet/SuperTetDashboard'));
const SubjectPage = lazy(() => import('@/pages/supertet/SubjectPage'));
const TopicPage = lazy(() => import('@/pages/supertet/TopicPage'));
const TestSetupPage = lazy(() => import('@/pages/supertet/TestSetupPage'));
const TestRunnerPage = lazy(() => import('@/pages/supertet/TestRunnerPage'));
const TestResultPage = lazy(() => import('@/pages/supertet/TestResultPage'));
const TestReviewPage = lazy(() => import('@/pages/supertet/TestReviewPage'));
const NotesPage = lazy(() => import('@/pages/supertet/NotesPage'));
const NoteDetailPage = lazy(() => import('@/pages/supertet/NoteDetailPage'));
const RevisionPage = lazy(() => import('@/pages/supertet/RevisionPage'));
const TestHistoryPage = lazy(() => import('@/pages/supertet/TestHistoryPage'));

const KvsDashboard = lazy(() => import('@/pages/kvs/KvsDashboard'));
const InterviewQuestionsPage = lazy(() => import('@/pages/kvs/InterviewQuestionsPage'));
const InterviewQuestionDetailPage = lazy(() => import('@/pages/kvs/InterviewQuestionDetailPage'));
const InterviewSetupPage = lazy(() => import('@/pages/kvs/InterviewSetupPage'));
const InterviewSessionPage = lazy(() => import('@/pages/kvs/InterviewSessionPage'));
const InterviewReportPage = lazy(() => import('@/pages/kvs/InterviewReportPage'));
const InterviewHistoryPage = lazy(() => import('@/pages/kvs/InterviewHistoryPage'));
const KvsInfoPage = lazy(() => import('@/pages/kvs/KvsInfoPage'));
const ReferenceVideosPage = lazy(() => import('@/pages/kvs/ReferenceVideosPage'));

const CurrentAffairsPage = lazy(() => import('@/pages/currentAffairs/CurrentAffairsPage'));
const CurrentAffairDetailPage = lazy(() => import('@/pages/currentAffairs/CurrentAffairDetailPage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));

function Fallback() {
  return <div className="p-4 space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>;
}

export default function App() {
  const onboarded = useUserStore((s) => s.onboarded);
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/welcome" element={<OnboardingPage />} />
          {!onboarded ? (
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          ) : (
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/plan" element={<StudyPlanPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/sources" element={<SourcesPage />} />

              <Route path="/supertet" element={<SuperTetDashboard />} />
              <Route path="/supertet/subject/:subjectId" element={<SubjectPage />} />
              <Route path="/supertet/topic/:topicId" element={<TopicPage />} />
              <Route path="/supertet/test/new" element={<TestSetupPage />} />
              <Route path="/supertet/test/history" element={<TestHistoryPage />} />
              <Route path="/supertet/test/:attemptId" element={<TestRunnerPage />} />
              <Route path="/supertet/test/:attemptId/result" element={<TestResultPage />} />
              <Route path="/supertet/test/:attemptId/review" element={<TestReviewPage />} />
              <Route path="/supertet/notes" element={<NotesPage />} />
              <Route path="/supertet/notes/:noteId" element={<NoteDetailPage />} />
              <Route path="/supertet/revision" element={<RevisionPage />} />

              <Route path="/kvs" element={<KvsDashboard />} />
              <Route path="/kvs/about" element={<KvsInfoPage />} />
              <Route path="/kvs/reference" element={<ReferenceVideosPage />} />
              <Route path="/kvs/questions" element={<InterviewQuestionsPage />} />
              <Route path="/kvs/questions/:id" element={<InterviewQuestionDetailPage />} />
              <Route path="/kvs/interview/new" element={<InterviewSetupPage />} />
              <Route path="/kvs/interview/history" element={<InterviewHistoryPage />} />
              <Route path="/kvs/interview/:sessionId" element={<InterviewSessionPage />} />
              <Route path="/kvs/interview/:sessionId/report" element={<InterviewReportPage />} />

              <Route path="/current-affairs" element={<CurrentAffairsPage />} />
              <Route path="/current-affairs/:id" element={<CurrentAffairDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
