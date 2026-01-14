import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import HomeworkSolvedCard from '@/components/student/homework/HomeworkSolvedCard';
import HomeworkCard from '@/components/student/homework/HomeworkCard';
import HomeworkCollectChat from './HomeworkCollectChat';
import HomeworkHomeBackground from '@/components/student/backgrounds/HomeworkHomeBackground.jsx';
import api from '@/api/axios';
import { useStudentContext } from '@/hooks/useStudentId';

const HomeworkHome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useStudentContext();
  const [showSolvedCard, setShowSolvedCard] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [homeworkScans, setHomeworkScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingScanId, setEditingScanId] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isCompletedSectionExpanded, setIsCompletedSectionExpanded] = useState(true);
  const [isCompletingHomework, setIsCompletingHomework] = useState(false);
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(orientation: portrait)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch homework scans for the student
  useEffect(() => {
    const fetchHomeworkScans = async () => {
      if (!studentId) {
        setLoadingScans(false);
        return;
      }

      try {
        setLoadingScans(true);
        // Try to get homework scans - the endpoint should handle user_id or student_id
        // First, get the student record ID from user ID
        let studentRecordId = null;
        try {
          const studentRes = await api.get(`/student-id?user_id=${studentId}`);
          studentRecordId = studentRes.data?.student_id;
        } catch (err) {
          console.warn('Could not get student record ID, trying direct fetch:', err);
        }
        
        if (studentRecordId) {
          const { data } = await api.get(`/student/${studentRecordId}/homeworkscans`);
          setHomeworkScans(Array.isArray(data) ? data : []);
        } else {
          // Fallback: try fetching all and filter by user_id if needed
          // Or try with student_id as user_id (in case they're the same)
          try {
            const { data } = await api.get(`/homeworkscans?student_id=${studentId}`);
            setHomeworkScans(Array.isArray(data) ? data.filter(scan => {
              // Filter by checking if scan belongs to this user's student record
              return scan.student_id || true; // Accept all for now, backend should filter
            }) : []);
          } catch (err) {
            console.error('Error fetching homework scans:', err);
            setHomeworkScans([]);
          }
        }
      } catch (error) {
        console.error('Error fetching homework scans:', error);
        setHomeworkScans([]);
      } finally {
        setLoadingScans(false);
      }
    };

    fetchHomeworkScans();
  }, [studentId]);

  // Refresh homework scans when chat modal closes (new scan might have been added)
  useEffect(() => {
    if (!showCollectModal && studentId) {
      // Refetch scans when modal closes
      const fetchHomeworkScans = async () => {
        try {
          let studentRecordId = null;
          try {
            const studentRes = await api.get(`/student-id?user_id=${studentId}`);
            studentRecordId = studentRes.data?.student_id;
          } catch (err) {
            console.warn('Could not get student record ID:', err);
          }
          
          if (studentRecordId) {
            const { data } = await api.get(`/student/${studentRecordId}/homeworkscans`);
            setHomeworkScans(Array.isArray(data) ? data : []);
          }
        } catch (error) {
          console.error('Error refreshing homework scans:', error);
        }
      };
      
      // Small delay to ensure backend has processed the scan
      setTimeout(fetchHomeworkScans, 1000);
    }
  }, [showCollectModal, studentId]);

  // To show the solved card after homework completion, call:
  // setShowSolvedCard(true)
  // This should be triggered when a homework task is marked as completed

  const handleNewTaskClick = () => {
    // Open the collect chat modal for a new task
    setSelectedScanId(null);
    setShowCollectModal(true);
  };

  const handleCardClick = (scanId) => {
    // Open the collect chat modal for the selected homework
    // Ensure scanId is a number (not a string like "scan-0")
    const numericScanId = typeof scanId === 'number' ? scanId : (typeof scanId === 'string' && !isNaN(parseInt(scanId)) ? parseInt(scanId) : scanId);
    setSelectedScanId(numericScanId);
    setShowCollectModal(true);
  };

  const handleEditClick = async (scanId, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    // Check if homework is completed - don't allow editing completed homework
    const scan = homeworkScans.find(s => s.id === scanId);
    if (scan && scan.status === 'completed') {
      return; // Don't show edit modal for completed homework
    }
    
    // Show edit modal with options
    setEditingScanId(scanId);
    setShowEditModal(true);
  };

  const handleCompleteHomework = async () => {
    if (!editingScanId) return;

    // Prompt to scan completed worksheet before marking as completed
    const shouldScan = window.confirm(
      'Bitte scanne zuerst das vollständig ausgefüllte Arbeitsblatt ein.\n\n' +
      'Die KI wird dann deine Ergebnisse überprüfen, falsche Aufgaben zeigen und dir helfen, bevor die Hausaufgabe als erledigt markiert wird.'
    );

    if (!shouldScan) {
      return; // User cancelled
    }

    // Open the collect chat modal to scan the completed worksheet
    setShowEditModal(false);
    setSelectedScanId(editingScanId);
    setIsCompletingHomework(true);
    setShowCollectModal(true);
  };

  const handleDoItLater = async () => {
    if (!editingScanId) return;

    try {
      // Update backend to set status to 'do_it_later'
      try {
        const requestBody = {
          status: 'do_it_later'
        };
        console.log('📤 Sending request to backend:', {
          url: `/homeworkscans/${editingScanId}/completion`,
          method: 'PUT',
          body: requestBody,
          scanId: editingScanId,
          bodyType: typeof requestBody.status,
          bodyValue: requestBody.status
        });
        
        const response = await api.put(`/homeworkscans/${editingScanId}/completion`, requestBody, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ Backend update successful:', response.data);
      } catch (apiError) {
        const errorData = apiError.response?.data || {};
        console.error('❌ Backend API error:', {
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: errorData,
          message: errorData.message || apiError.message,
          requestBody: requestBody,
          fullError: apiError
        });
        throw apiError;
      }

      // Update local state to move it to "Später erledigen" section
      setHomeworkScans(prev => {
        const updated = prev.map(scan => {
          const scanIdStr = String(scan.id);
          const editingIdStr = String(editingScanId);
          
          if (scanIdStr === editingIdStr) {
            console.log('Moving homework to "Do it later":', {
              scanId: scan.id,
              editingScanId,
              oldStatus: scan.status,
              newStatus: 'do_it_later'
            });
            
            // Create a new object with updated status
            return { ...scan, status: 'do_it_later' };
          }
          return scan;
        });
        
        return updated;
      });

      // Force a re-render by updating a dummy state
      setForceUpdate(prev => prev + 1);

      // Close modal after state update
      setShowEditModal(false);
      setEditingScanId(null);
      console.log('✅ Homework moved to "Do it later" section and persisted to backend', {
        scanId: editingScanId,
        status: 'do_it_later'
      });
    } catch (error) {
      console.error('❌ Error moving homework:', error);
      alert('Fehler beim Verschieben der Hausaufgabe. Bitte versuche es erneut.');
    }
  };

  const handleDeleteClick = async (scanId, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    
    // Find the homework scan to get its details for the warning
    const scanToDelete = homeworkScans.find(scan => scan.id === scanId);
    const homeworkTitle = scanToDelete?.task_type || scanToDelete?.raw_text?.split(/\s+/).slice(0, 5).join(' ') || 'diese Hausaufgabe';
    
    // Professional delete confirmation modal
    Modal.confirm({
      title: 'Hausaufgabe löschen?',
      content: (
        <div style={{ fontFamily: 'Nunito', fontSize: '16px', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '12px', color: '#3A362E' }}>
            Möchtest du wirklich <strong>{homeworkTitle}</strong> löschen?
          </p>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Gespräche und Daten werden ebenfalls gelöscht.
          </p>
        </div>
      ),
      okText: 'Löschen',
      okButtonProps: { 
        danger: true,
        style: {
          fontFamily: 'Nunito',
          fontWeight: 700,
          borderRadius: '8px'
        }
      },
      cancelText: 'Abbrechen',
      cancelButtonProps: {
        style: {
          fontFamily: 'Nunito',
          fontWeight: 700,
          borderRadius: '8px'
        }
      },
      width: 480,
      centered: true,
      onOk: async () => {
        try {
          await api.delete(`/homeworkscans/${scanId}`);
          
          // Remove the deleted scan from the list
          setHomeworkScans(prev => prev.filter(scan => scan.id !== scanId));
          
          console.log('✅ Homework scan deleted successfully');
        } catch (error) {
          console.error('❌ Error deleting homework scan:', error);
          Modal.error({
            title: 'Fehler beim Löschen',
            content: 'Die Hausaufgabe konnte nicht gelöscht werden. Bitte versuche es erneut.',
            okText: 'OK',
            okButtonProps: {
              style: {
                fontFamily: 'Nunito',
                fontWeight: 700,
                borderRadius: '8px'
              }
            }
          });
        }
      },
    });
  };


  return (
    <>
      <Helmet>
        <title>Hausaufgaben | Kibundo</title>
        <meta name="description" content="Manage your homework tasks. Create new tasks, organize by priority, and track your progress." />
        <meta property="og:title" content="Hausaufgaben | Kibundo" />
        <meta property="og:description" content="Manage your homework tasks. Create new tasks, organize by priority, and track your progress." />
      </Helmet>
      <main
        className="relative w-full min-h-screen"
        style={{
          width: '100%',
          maxWidth: '1280px',
          minHeight: '100vh',
          height: 'auto',
          maxHeight: 'none',
          margin: '0 auto',
          position: 'relative',
          backgroundColor: 'transparent',
          overflow: 'visible',
          zIndex: 1,
          boxSizing: 'border-box',
          padding: 'clamp(24px, 3vh, 48px) clamp(24px, 3vw, 48px) clamp(80px, 10vh, 120px)'
        }}
      >
        <HomeworkHomeBackground />

        {/* Clouds Background Component - responsive */}
        <div
          className="absolute left-0 w-full"
          style={{
            top: 'clamp(16px, 3vw, 24px)',
            height: 'clamp(300px, 51.25vw, 410px)',
            opacity: 0.3
          }}
        >
          <img
            src="/images/img_component_4.svg"
            alt="Clouds"
            className="w-full h-full object-cover opacity-30"
          />
        </div>

        {/* Back Button - top right, responsive */}
        <button
          onClick={() => navigate('/student/home')}
          className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity z-50"
          style={{
            top: 'clamp(16px, 3vw, 24px)',
            right: 'clamp(16px, 1.875vw, 24px)',
            width: 'clamp(40px, 3.75vw, 48px)',
            height: 'clamp(40px, 3.75vw, 48px)',
            backgroundColor: '#D9D9D9'
          }}
          aria-label="Go back"
        >
          <img
            src="/images/img_vector_gray_800.svg"
            alt="Back arrow"
            style={{
              width: 'clamp(14px, 1.4vw, 18px)',
              height: 'clamp(24px, 2.34vw, 30px)'
            }}
          />
        </button>

        {/* Hausaufgaben Title - responsive, centered */}
        <h1
          className="absolute top-[75px] left-1/2 transform -translate-x-1/2 text-center"
          style={{
            width: 'clamp(200px, 22.6vw, 289px)',
            height: 'auto',
            minHeight: 'clamp(40px, 6.875vw, 55px)',
            fontFamily: 'Nunito',
            fontWeight: 900,
            fontSize: 'clamp(28px, 3.125vw, 40px)',
            lineHeight: '1.375',
            letterSpacing: '2%',
            color: '#287D7F'
          }}
        >
          Hausaufgaben
        </h1>

        {/* Left Character - M3eWEd.tif - responsive */}
        <img
          src="/images/img_ebene_1.png"
          alt="Left character"
          className="absolute left-0 top-[39.55px] hidden md:block"
          style={{
            width: 'clamp(150px, 20.8vw, 266.48px)',
            height: 'auto',
            aspectRatio: '266.48 / 276.45',
            objectFit: 'cover'
          }}
        />



        {/* Right Character - M3eWEd.tif - responsive */}
        <img
          src="/images/img_ebene_1_446x260.png"
          alt="Right character"
          className="absolute right-0 top-[74.47px] hidden md:block"
          style={{
            width: 'clamp(120px, 15.5vw, 199px)',
            height: 'auto',
            aspectRatio: '199 / 245.5',
            objectFit: 'cover'
          }}
        />

        {/* Kibundo Component - responsive, positioned on right */}
        <div
          className="absolute"
          style={{
            top: 'clamp(70px, 11.25vw, 90px)',
            right: 'clamp(10px, 1.56vw, 20px)',
            width: 'clamp(280px, 27.3vw, 350px)',
            height: 'auto',
            aspectRatio: '350 / 225'
          }}
        >
          {/* Kibundo Character Image - responsive */}
          <img
            src="/images/img_kibundo.png"
            alt="Kibundo mascot"
            className="absolute"
            style={{
              left: isPortrait ? 'clamp(100px, 22vw, 180px)' : 'clamp(180px, 18.8vw, 241.14px)',
              top: 'clamp(4px, 0.76vw, 6.08px)',
              width: 'clamp(80px, 8.47vw, 108.47px)',
              height: 'auto',
              aspectRatio: '108.47 / 212.84',
              objectFit: 'contain'
            }}
          />

          {/* Sound Button - responsive */}
          <button
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: 'clamp(80px, 8.44vw, 108px)',
              top: 'clamp(20px, 3.5vw, 28px)',
              width: 'clamp(36px, 3.75vw, 48px)',
              height: 'clamp(36px, 3.75vw, 48px)',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
            }}
            aria-label="Sound button"
          >
            <img
              src="/images/img_sound_button_01.svg"
              alt="Sound"
              className="w-full h-full"
              style={{
                width: '70%',
                height: '70%',
                objectFit: 'contain'
              }}
            />
          </button>

          {/* Repeat Button - responsive */}
          <button
            className="absolute flex items-center justify-center rounded-full hover:opacity-90 transition-opacity"
            style={{
              left: 'clamp(130px, 13.75vw, 176px)',
              top: 'clamp(20px, 3.5vw, 28px)',
              width: 'clamp(36px, 3.75vw, 48px)',
              height: 'clamp(36px, 3.75vw, 48px)',
              backgroundColor: '#FFFFFF',
              boxShadow: '1px 1px 4px rgba(0, 0, 0, 0.25)'
            }}
            aria-label="Repeat button"
          >
            <img
              src="/images/img_repeat_button.svg"
              alt="Repeat"
              className="w-full h-full"
              style={{
                width: '70%',
                height: '70%',
                objectFit: 'contain'
              }}
            />
          </button>

          {/* Speech Bubble - responsive */}
          <div
            className="absolute"
            style={{
              left: 'clamp(2px, 0.31vw, 4px)',
              top: 'clamp(70px, 12.125vw, 97px)',
              width: 'clamp(170px, 16.8vw, 215px)',
              height: 'auto',
              minHeight: 'clamp(90px, 13.875vw, 111px)'
            }}
          >
            {/* Speech Bubble Arrow - responsive */}
            <img
              src="/images/img_vector.svg"
              alt="Speech indicator"
              className="absolute"
              style={{
                left: 'clamp(100px, 10.5vw, 134.79px)',
                top: 'clamp(-14px, -2.25vw, -18px)',
                width: 'clamp(40px, 4.3vw, 55.21px)',
                height: 'auto',
                aspectRatio: '55.21 / 25.32'
              }}
            />

            {/* Speech Bubble Content - responsive */}
            <div
              className="absolute rounded-[18px] border w-full"
              style={{
                height: 'auto',
                minHeight: 'clamp(90px, 13.875vw, 111px)',
                backgroundColor: '#D9F98D',
                borderColor: '#E1EAAC',
                borderWidth: '1px',
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(12px, 2.25vw, 18px)'
              }}
            >
              <p
                className="text-left"
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 400,
                  fontSize: 'clamp(14px, 1.406vw, 18px)',
                  lineHeight: '1.36',
                  color: '#000000',
                  margin: 0
                }}
              >
                Was magst Du lieber.{'\n'}
                Dinosaurier, oder{'\n'}
                Einhörner?
              </p>
            </div>
          </div>
        </div>

        {/* Neue Aufgabe Button - responsive, centered */}
        <button
          onClick={handleNewTaskClick}
          className="absolute hover:opacity-90 transition-opacity left-1/2 transform -translate-x-1/2"
          style={{
            top: 'clamp(140px, 19.75vw, 158px)',
            width: 'clamp(200px, 18.125vw, 232px)',
            height: 'auto',
            aspectRatio: '232 / 155',
            borderRadius: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            border: '2px dashed #FFFFFF',
            padding: '0',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden'
          }}
          aria-label="Neue Aufgabe"
        >
          {/* Button content with icon and text */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'clamp(8px, 1vw, 12px)',
              width: '100%',
              padding: 'clamp(12px, 1.5vw, 16px)'
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 'clamp(56px, 5.625vw, 72px)',
                height: 'clamp(56px, 5.625vw, 72px)',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                boxShadow: '1.5px 1.5px 6px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg style={{ width: 'clamp(32px, 3.125vw, 40px)', height: 'clamp(32px, 3.125vw, 40px)' }} viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="#EF7C2E" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            {/* Text */}
            <span
              style={{
                fontFamily: 'Nunito',
                fontWeight: 900,
                fontSize: 'clamp(18px, 1.95vw, 25px)',
                lineHeight: '1.36',
                letterSpacing: '2%',
                textAlign: 'center',
                color: '#EF7C2E'
              }}
            >
              Neue Aufgabe
            </span>
          </div>
        </button>

        {/* Homework Sections Container - flows naturally */}
        <div
          style={{
            marginTop: 'clamp(240px, 32vw, 280px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(16px, 2vw, 4px)',
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: '0 clamp(16px, 2vw, 24px)',
            overflow: 'visible'
          }}
        >
          {/* Zuerst erledigen Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vw, 16px)' }}>
            {/* Zuerst erledigen Bar */}
            <div
              style={{
                height: 'clamp(45px, 6.5vw, 52px)',
                borderRadius: '16px',
                backgroundColor: '#F4EDE6',
                boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(10px, 1.5vw, 12px) clamp(20px, 2.73vw, 35px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxSizing: 'border-box'
              }}
            >
              {/* Check Icon with number 1 */}
              <div
                style={{
                  width: '26px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  border: '1px solid #544C3B',
                  flexShrink: 0
                }}
              >
                <span
                  style={{
                    fontFamily: 'Nunito',
                    fontWeight: 900,
                    fontSize: '16px',
                    lineHeight: '22px',
                    color: '#544C3B'
                  }}
                >
                  1
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 800,
                  fontSize: 'clamp(18px, 1.875vw, 24px)',
                  lineHeight: '1.375',
                  color: '#544C3B'
                }}
              >
                Zuerst erledigen
              </span>
            </div>

            {/* Zuerst erledigen - Homework Cards Section */}
            {homeworkScans.filter(scan => {
              // Use status field if available, otherwise fall back to old logic
              if (scan.status) {
                return scan.status === 'pending';
              }
              // Backwards compatibility: check if completed
              if (scan.completed_at || scan.completion_photo_url) return false;
              // Backwards compatibility: check days since creation
              const scanDate = scan.created_at ? new Date(scan.created_at) : new Date();
              const daysSinceCreation = Math.floor((new Date().getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24));
              return daysSinceCreation <= 3;
            }).length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: isPortrait ? 'clamp(12px, 2vw, 16px)' : 'clamp(12px, 1.5vw, 16px)',
                  paddingTop: 'clamp(12px, 1.5vw, 16px)',
                  paddingBottom: 'clamp(16px, 2vw, 20px)',
                  boxSizing: 'border-box',
                  width: '100%',
                  minWidth: 0,
                  overflow: 'visible',
                  position: 'relative',
                  zIndex: 1,
                  alignItems: 'flex-start'
                }}
              >
            {homeworkScans
              .filter(scan => {
                // Use status field if available
                if (scan.status) {
                  return scan.status === 'pending';
                }
                // Backwards compatibility: check if completed
                if (scan.completed_at || scan.completion_photo_url) return false;
                // Backwards compatibility: check days since creation
                const scanDate = scan.created_at ? new Date(scan.created_at) : new Date();
                const daysSinceCreation = Math.floor((new Date().getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysSinceCreation <= 3;
              })
              .map((scan, index) => {
                // Ensure scan.id is a valid primitive
                const scanId = scan?.id != null ? String(scan.id) : `scan-${index}`;
                
                // Determine subject colors and styling
                const isMath = scan.detected_subject === 'Mathe' || scan.detected_subject === 'Math';
                const isGerman = scan.detected_subject === 'Deutsch' || scan.detected_subject === 'German';
                const isOther = !isMath && !isGerman;
                
                const cardBg = isMath ? '#D8EFEE' : isGerman ? '#EFD5D5' : '#DBEFCE';
                const subjectColor = '#3A362E';
                const borderColor = '#FFFFFF';
                
                // Extract short title from task description - use real data
                // Priority: task_type > extracted from raw_text > default
                let taskTitle = 'Hausaufgabe';
                if (scan.task_type) {
                  // Use task_type if available
                  taskTitle = scan.task_type;
                  // Truncate if too long
                  if (taskTitle.length > 40) {
                    taskTitle = taskTitle.substring(0, 37).trim() + '...';
                  }
                } else if (scan.raw_text) {
                  // Extract from raw_text if task_type not available
                  const cleanedText = String(scan.raw_text || '').trim();
                  // Extract first 3-5 words as title
                  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
                  if (words.length > 0) {
                    // Take first 5 words max, or less if total length would be too long
                    const titleWords = words.slice(0, 5);
                    taskTitle = titleWords.join(' ');
                    // If still too long, truncate to ~40 characters
                    if (taskTitle.length > 40) {
                      taskTitle = taskTitle.substring(0, 37).trim() + '...';
                    }
                  }
                }
                
                // Format date - try to extract from raw_text or use created_at + default offset
                let dateText = 'bis diesen Mittwoch';
                const now = new Date();
                
                // Try to extract date from raw_text (look for German date patterns)
                const rawText = scan.raw_text || '';
                const datePatterns = [
                  /(?:bis|until|due|fällig|abgabedatum)[\s:]+(?:diesen|diesem|nächsten|nächste)?[\s]+?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i,
                  /(?:bis|until|due|fällig)[\s:]+(?:heute|today|morgen|tomorrow)/i,
                  /(?:bis|until|due|fällig)[\s:]+(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/i
                ];
                
                let extractedDate = null;
                for (const pattern of datePatterns) {
                  const match = rawText.match(pattern);
                  if (match) {
                    if (match[1] === 'heute' || match[1] === 'today') {
                      dateText = 'bis heute';
                      extractedDate = now;
                    } else if (match[1] === 'morgen' || match[1] === 'tomorrow') {
                      dateText = 'bis morgen';
                      extractedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    } else if (match[1] && ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'].includes(match[1].toLowerCase())) {
                      // Day of week found
                      const dayNames = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
                      const targetDay = dayNames.indexOf(match[1].toLowerCase());
                      const currentDay = now.getDay();
                      let daysUntil = (targetDay - currentDay + 7) % 7;
                      if (daysUntil === 0) daysUntil = 7; // Next week if today
                      extractedDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
                      
                      if (daysUntil === 0) dateText = 'bis heute';
                      else if (daysUntil === 1) dateText = 'bis morgen';
                      else if (daysUntil <= 7) {
                        const dayText = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][targetDay];
                        dateText = `bis diesen ${dayText}`;
                      }
                    }
                    break;
                  }
                }
                
                // If no date extracted, use created_at + 3 days as default
                if (!extractedDate && scan.created_at) {
                  const scanDate = new Date(scan.created_at);
                  const defaultDueDate = new Date(scanDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from creation
                  const daysUntilDue = Math.ceil((defaultDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (daysUntilDue <= 0) dateText = 'bis heute';
                  else if (daysUntilDue === 1) dateText = 'bis morgen';
                  else if (daysUntilDue === 2) dateText = 'bis übermorgen';
                  else if (daysUntilDue <= 7) {
                    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                    const dayName = dayNames[defaultDueDate.getDay()];
                    dateText = `bis diesen ${dayName}`;
                  } else {
                    dateText = 'bis nächste Woche';
                  }
                }
                
                // Determine source (Seite or Arbeitsblatt) and extract page number - use real data
                let sourceText = 'Arbeitsblatt';
                const pageText = scan.raw_text || '';
                const rawTextLower = pageText.toLowerCase();
                
                // Try multiple patterns to extract page number from raw_text
                const pagePatterns = [
                  /(?:seite|page|s\.|p\.|s\s|p\s)[\s:]*(\d+)/i,  // "Seite 45", "page 45", "S. 45", "p. 45"
                  /(?:auf|from|von)[\s]+(?:seite|page|s\.|p\.)[\s:]*(\d+)/i,  // "auf Seite 45", "from page 45"
                  /(?:seite|page)[\s:]*(\d+)[\s]*(?:bis|-|to)[\s]*(\d+)/i,  // "Seite 45 bis 50" or "page 45-50"
                  /(\d+)[\s]*(?:seite|page)/i,  // "45 Seite" or "45 page"
                ];
                
                let pageNumber = null;
                let pageRange = null;
                
                for (const pattern of pagePatterns) {
                  const match = pageText.match(pattern);
                  if (match) {
                    if (match[1] && match[2]) {
                      // Page range found (e.g., "Seite 45 bis 50")
                      pageNumber = match[1];
                      pageRange = match[2];
                      break;
                    } else if (match[1]) {
                      // Single page number found
                      pageNumber = match[1];
                      break;
                    }
                  }
                }
                
                if (pageNumber) {
                  if (pageRange) {
                    sourceText = `Seite ${pageNumber}-${pageRange}`;
                  } else {
                    sourceText = `Seite ${pageNumber}`;
                  }
                } else if (rawTextLower.includes('seite') || rawTextLower.includes('page')) {
                  // Page mentioned but no number found
                  sourceText = 'Seite';
                } else {
                  // Default to Arbeitsblatt if no page info found
                  sourceText = 'Arbeitsblatt';
                }
                
                // Get the correct SVG background image
                const cardSvg = isMath 
                  ? '/images/img_homework_card_math.svg'
                  : isGerman 
                  ? '/images/img_homework_card_german.svg'
                  : '/images/img_homework_card_other.svg';
                
                const subjectName = isMath ? 'Mathe' : isGerman ? 'Deutsch' : 'Sonstiges';
                
                return (
                  <HomeworkCard
                    key={scanId}
                    scan={scan}
                    isPortrait={isPortrait}
                    onCardClick={handleCardClick}
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                  />
                );
              })}
              </div>
            )}
          </div>

          {/* Später erledigen Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vw, 16px)' }}>
            {/* Später erledigen Bar */}
            <div
              style={{
                height: 'clamp(45px, 6.5vw, 52px)',
                borderRadius: '16px',
                backgroundColor: '#F3E6C8',
                boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(10px, 1.5vw, 12px) clamp(20px, 2.73vw, 35px)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxSizing: 'border-box'
              }}
            >
              {/* Check Icon with number 2 */}
              <div
                style={{
                  width: '26px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  border: '1px solid #544C3B',
                  flexShrink: 0
                }}
              >
                <span
                  style={{
                    fontFamily: 'Nunito',
                    fontWeight: 900,
                    fontSize: '16px',
                    lineHeight: '22px',
                    color: '#544C3B'
                  }}
                >
                  2
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 800,
                  fontSize: 'clamp(18px, 1.875vw, 24px)',
                  lineHeight: '1.375',
                  color: '#544C3B'
                }}
              >
                Später erledigen
              </span>
            </div>

            {/* Später erledigen - Homework Cards Section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: isPortrait ? 'clamp(12px, 2vw, 16px)' : 'clamp(12px, 1.5vw, 16px)',
                paddingTop: 'clamp(12px, 1.5vw, 16px)',
                paddingBottom: 'clamp(16px, 2vw, 20px)',
                boxSizing: 'border-box',
                width: '100%',
                minWidth: 0
              }}
            >
            {homeworkScans
              .filter(scan => {
                // Use status field if available
                if (scan.status) {
                  return scan.status === 'do_it_later';
                }
                // Backwards compatibility: check if completed
                if (scan.completed_at || scan.completion_photo_url) return false;
                // Backwards compatibility: check days since creation
                const scanDate = scan.created_at ? new Date(scan.created_at) : new Date();
                const daysSinceCreation = Math.floor((new Date().getTime() - scanDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysSinceCreation > 3;
              })
              .map((scan, index) => {
                // Ensure scan.id is a valid primitive
                const scanId = scan?.id != null ? String(scan.id) : `scan-${index}`;
                
                // Determine subject colors and styling
                const isMath = scan.detected_subject === 'Mathe' || scan.detected_subject === 'Math';
                const isGerman = scan.detected_subject === 'Deutsch' || scan.detected_subject === 'German';
                const isOther = !isMath && !isGerman;
                
                const cardBg = isMath ? '#D8EFEE' : isGerman ? '#EFD5D5' : '#DBEFCE';
                const subjectColor = '#3A362E';
                const borderColor = '#FFFFFF';
                
                // Extract short title from task description - use real data
                // Priority: task_type > extracted from raw_text > default
                let taskTitle = 'Hausaufgabe';
                if (scan.task_type) {
                  // Use task_type if available
                  taskTitle = scan.task_type;
                  // Truncate if too long
                  if (taskTitle.length > 40) {
                    taskTitle = taskTitle.substring(0, 37).trim() + '...';
                  }
                } else if (scan.raw_text) {
                  // Extract from raw_text if task_type not available
                  const cleanedText = String(scan.raw_text || '').trim();
                  // Extract first 3-5 words as title
                  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
                  if (words.length > 0) {
                    // Take first 5 words max, or less if total length would be too long
                    const titleWords = words.slice(0, 5);
                    taskTitle = titleWords.join(' ');
                    // If still too long, truncate to ~40 characters
                    if (taskTitle.length > 40) {
                      taskTitle = taskTitle.substring(0, 37).trim() + '...';
                    }
                  }
                }
                
                // Format date - try to extract from raw_text or use created_at + default offset
                let dateText = 'bis diesen Mittwoch';
                const now = new Date();
                
                // Try to extract date from raw_text (look for German date patterns)
                const rawText = scan.raw_text || '';
                const datePatterns = [
                  /(?:bis|until|due|fällig|abgabedatum)[\s:]+(?:diesen|diesem|nächsten|nächste)?[\s]+?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/i,
                  /(?:bis|until|due|fällig)[\s:]+(?:heute|today|morgen|tomorrow)/i,
                  /(?:bis|until|due|fällig)[\s:]+(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/i
                ];
                
                let extractedDate = null;
                for (const pattern of datePatterns) {
                  const match = rawText.match(pattern);
                  if (match) {
                    if (match[1] === 'heute' || match[1] === 'today') {
                      dateText = 'bis heute';
                      extractedDate = now;
                    } else if (match[1] === 'morgen' || match[1] === 'tomorrow') {
                      dateText = 'bis morgen';
                      extractedDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    } else if (match[1] && ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag', 'sonntag'].includes(match[1].toLowerCase())) {
                      // Day of week found
                      const dayNames = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
                      const targetDay = dayNames.indexOf(match[1].toLowerCase());
                      const currentDay = now.getDay();
                      let daysUntil = (targetDay - currentDay + 7) % 7;
                      if (daysUntil === 0) daysUntil = 7; // Next week if today
                      extractedDate = new Date(now.getTime() + daysUntil * 24 * 60 * 60 * 1000);
                      
                      if (daysUntil === 0) dateText = 'bis heute';
                      else if (daysUntil === 1) dateText = 'bis morgen';
                      else if (daysUntil <= 7) {
                        const dayText = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][targetDay];
                        dateText = `bis diesen ${dayText}`;
                      }
                    }
                    break;
                  }
                }
                
                // If no date extracted, use created_at + 3 days as default
                if (!extractedDate && scan.created_at) {
                  const scanDate = new Date(scan.created_at);
                  const defaultDueDate = new Date(scanDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from creation
                  const daysUntilDue = Math.ceil((defaultDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (daysUntilDue <= 0) dateText = 'bis heute';
                  else if (daysUntilDue === 1) dateText = 'bis morgen';
                  else if (daysUntilDue === 2) dateText = 'bis übermorgen';
                  else if (daysUntilDue <= 7) {
                    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
                    const dayName = dayNames[defaultDueDate.getDay()];
                    dateText = `bis diesen ${dayName}`;
                  } else {
                    dateText = 'bis nächste Woche';
                  }
                }
                
                // Determine source (Seite or Arbeitsblatt) and extract page number - use real data
                let sourceText = 'Arbeitsblatt';
                const pageText = scan.raw_text || '';
                const rawTextLower = pageText.toLowerCase();
                
                // Try multiple patterns to extract page number from raw_text
                const pagePatterns = [
                  /(?:seite|page|s\.|p\.|s\s|p\s)[\s:]*(\d+)/i,  // "Seite 45", "page 45", "S. 45", "p. 45"
                  /(?:auf|from|von)[\s]+(?:seite|page|s\.|p\.)[\s:]*(\d+)/i,  // "auf Seite 45", "from page 45"
                  /(?:seite|page)[\s:]*(\d+)[\s]*(?:bis|-|to)[\s]*(\d+)/i,  // "Seite 45 bis 50" or "page 45-50"
                  /(\d+)[\s]*(?:seite|page)/i,  // "45 Seite" or "45 page"
                ];
                
                let pageNumber = null;
                let pageRange = null;
                
                for (const pattern of pagePatterns) {
                  const match = pageText.match(pattern);
                  if (match) {
                    if (match[1] && match[2]) {
                      // Page range found (e.g., "Seite 45 bis 50")
                      pageNumber = match[1];
                      pageRange = match[2];
                      break;
                    } else if (match[1]) {
                      // Single page number found
                      pageNumber = match[1];
                      break;
                    }
                  }
                }
                
                if (pageNumber) {
                  if (pageRange) {
                    sourceText = `Seite ${pageNumber}-${pageRange}`;
                  } else {
                    sourceText = `Seite ${pageNumber}`;
                  }
                } else if (rawTextLower.includes('seite') || rawTextLower.includes('page')) {
                  // Page mentioned but no number found
                  sourceText = 'Seite';
                } else {
                  // Default to Arbeitsblatt if no page info found
                  sourceText = 'Arbeitsblatt';
                }
                
                return (
                  <HomeworkCard
                    key={scanId}
                    scan={scan}
                    isPortrait={isPortrait}
                    onCardClick={handleCardClick}
                    onEditClick={handleEditClick}
                    onDeleteClick={handleDeleteClick}
                  />
                );
              })}
            </div>
          </div>

          {/* Erledigte Hausaufgaben Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 1.5vw, 16px)' }}>
            {/* Archive Section - Erledigte Hausaufgaben Bar */}
            <div
              onClick={() => setIsCompletedSectionExpanded(!isCompletedSectionExpanded)}
              style={{
                height: 'clamp(45px, 6.5vw, 52px)',
                borderRadius: '16px',
                backgroundColor: '#287D7F',
                boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
                padding: 'clamp(10px, 1.5vw, 12px) clamp(20px, 3.125vw, 40px) clamp(10px, 1.5vw, 12px) clamp(20px, 2.73vw, 35px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                boxSizing: 'border-box',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f6a6c'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#287D7F'}
            >
            {/* Check Icon */}
            <div
              style={{
                width: '26px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: '50%'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11.6667 3.5L5.25 9.91667L2.33334 7" stroke="#287D7F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span
              style={{
                fontFamily: 'Nunito',
                fontWeight: 900,
                fontSize: 'clamp(18px, 1.875vw, 24px)',
                lineHeight: '1.375',
                color: '#FFFFFF',
                flex: 1
              }}
            >
              Erledigte Hausaufgaben
            </span>
            {/* Arrow Icon */}
            <img
              src="/images/img_vector_gray_800.svg"
              alt={isCompletedSectionExpanded ? "Collapse" : "Expand"}
              style={{
                width: '14px',
                height: '23.64px',
                transform: isCompletedSectionExpanded ? 'rotate(90deg)' : 'rotate(-90deg)',
                filter: 'invert(1)',
                transition: 'transform 0.3s ease'
              }}
            />
            </div>
            
            {/* Completed Homework Cards Section */}
            {isCompletedSectionExpanded && homeworkScans.filter(scan => {
              // Use status field if available
              if (scan.status) {
                return scan.status === 'completed';
              }
              // Backwards compatibility: check completed_at or completion_photo_url
              return scan.completed_at || scan.completion_photo_url;
            }).length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: isPortrait ? 'clamp(12px, 2vw, 16px)' : 'clamp(12px, 1.5vw, 16px)',
                  paddingTop: 'clamp(12px, 1.5vw, 16px)',
                  paddingBottom: 'clamp(8px, 1vw, 12px)',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              >
              {homeworkScans
                .filter(scan => {
                  // Use status field if available
                  if (scan.status) {
                    return scan.status === 'completed';
                  }
                  // Backwards compatibility: check completed_at or completion_photo_url
                  return scan.completed_at || scan.completion_photo_url;
                })
                .map((scan, index) => {
                  // Ensure scan.id is a valid primitive
                  const scanId = scan?.id != null ? String(scan.id) : `scan-completed-${index}`;
                  
                  return (
                    <HomeworkCard
                      key={scanId}
                      scan={scan}
                      isPortrait={isPortrait}
                      onCardClick={handleCardClick}
                      onEditClick={handleEditClick}
                      onDeleteClick={handleDeleteClick}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Loading Bar - responsive, hidden on small screens */}
        <div
          className="absolute right-0 hidden lg:block"
          style={{
            top: 'clamp(250px, 41.375vw, 331px)',
            width: 'clamp(8px, 0.78vw, 10px)',
            height: 'clamp(350px, 58.625vw, 469px)',
            borderRadius: '40px',
            backgroundColor: '#F1E0D0',
            boxShadow: 'inset 0px 0px 3px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}
        >
          {/* Progress fill - empty state, so no fill */}
          <div
            style={{
              width: '100%',
              height: '0%',
              backgroundColor: '#BDCF56',
              borderRadius: '40px',
              boxShadow: 'inset 0px 0px 10px rgba(0, 0, 0, 0.25)',
              transition: 'height 0.5s ease-in-out'
            }}
          />
        </div>
        
        {/* Homework Collect Chat - Sticky to bottom of homework home, responsive */}
        {showCollectModal && (
          <div
            className="fixed bottom-0 left-0 right-0 z-40"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '100vh',
              backgroundColor: 'transparent',
              overflow: 'hidden',
              pointerEvents: 'auto'
            }}
          >
            <HomeworkCollectChat
              isOpen={showCollectModal}
              initialScanId={selectedScanId}
              isCompletingHomework={isCompletingHomework}
              onClose={() => {
                setShowCollectModal(false);
                setSelectedScanId(null);
                setIsCompletingHomework(false);
              }}
              onScanComplete={() => {
                // Refresh homework scans when a new scan is completed
                if (studentId) {
                  const fetchHomeworkScans = async () => {
                    try {
                      let studentRecordId = null;
                      try {
                        const studentRes = await api.get(`/student-id?user_id=${studentId}`);
                        studentRecordId = studentRes.data?.student_id;
                      } catch (err) {
                        console.warn('Could not get student record ID:', err);
                      }
                      
                      if (studentRecordId) {
                        const { data } = await api.get(`/student/${studentRecordId}/homeworkscans`);
                        setHomeworkScans(Array.isArray(data) ? data : []);
                      }
                    } catch (error) {
                      console.error('Error refreshing homework scans:', error);
                    }
                  };
                  
                  // Delay to ensure backend has processed the scan
                  setTimeout(fetchHomeworkScans, 1500);
                }
              }}
            />
          </div>
        )}
      </main>
      {/* Homework Solved Card - Pops out after homework completion */}
      {/* Edit Homework Modal */}
      {showEditModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setShowEditModal(false);
            setEditingScanId(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: 'clamp(24px, 3vw, 32px)',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontFamily: 'Nunito',
                fontWeight: 800,
                fontSize: 'clamp(20px, 2.5vw, 24px)',
                color: '#1a1a1a',
                marginBottom: 'clamp(16px, 2vw, 20px)',
                textAlign: 'center'
              }}
            >
              Hausaufgabe bearbeiten
            </h2>
            
            <p
              style={{
                fontFamily: 'Nunito',
                fontSize: 'clamp(14px, 1.75vw, 16px)',
                color: '#666',
                marginBottom: 'clamp(24px, 3vw, 32px)',
                textAlign: 'center'
              }}
            >
              Was möchtest du mit dieser Hausaufgabe machen?
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(12px, 1.5vw, 16px)'
              }}
            >
              <button
                onClick={handleCompleteHomework}
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 700,
                  fontSize: 'clamp(16px, 2vw, 18px)',
                  color: '#FFFFFF',
                  backgroundColor: '#287D7F',
                  border: 'none',
                  borderRadius: '12px',
                  padding: 'clamp(14px, 2vw, 18px)',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                ✓ Als erledigt markieren
              </button>

              <button
                onClick={handleDoItLater}
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 700,
                  fontSize: 'clamp(16px, 2vw, 18px)',
                  color: '#287D7F',
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #287D7F',
                  borderRadius: '12px',
                  padding: 'clamp(14px, 2vw, 18px)',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                Später erledigen
              </button>

              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingScanId(null);
                }}
                style={{
                  fontFamily: 'Nunito',
                  fontWeight: 600,
                  fontSize: 'clamp(14px, 1.75vw, 16px)',
                  color: '#666',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  padding: 'clamp(12px, 1.5vw, 16px)',
                  cursor: 'pointer',
                  marginTop: 'clamp(8px, 1vw, 12px)'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      <HomeworkSolvedCard 
        isOpen={showSolvedCard} 
        onClose={() => setShowSolvedCard(false)} 
      />
    </>
  );
};

export default HomeworkHome;
