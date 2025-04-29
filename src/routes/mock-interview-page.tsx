/* eslint-disable @typescript-eslint/no-unused-vars */
import { Interview } from "@/types";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LoaderPage } from "./loader-page";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/config/firebase.config";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb } from "lucide-react";
import { QuestionSection } from "@/components/question-section";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export const MockInterviewPage = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    const fetchInterview = async () => {
      if (interviewId) {
        try {
          const interviewDoc = await getDoc(doc(db, "interviews", interviewId));
          if (interviewDoc.exists()) {
            const data = interviewDoc.data();
            if (!data.currentAttempt) {
              await updateDoc(doc(db, "interviews", interviewId), {
                currentAttempt: 1
              });
              data.currentAttempt = 1;
            }
            setInterview({
              id: interviewDoc.id,
              ...data,
            } as Interview);
          }
        } catch (error) {
          console.log(error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchInterview();
  }, [interviewId, navigate]);

  const handleCompleteInterview = async () => {
    if (!interview || !interviewId) return;
    
    setIsCompleting(true);
    try {
      await updateDoc(doc(db, "interviews", interviewId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        currentAttempt: (interview.currentAttempt || 1) + 1
      });
      
      toast.success("Interview completed!", {
        description: "You can view your feedback in the feedback section."
      });
      
      navigate(`/generate/feedback/${interviewId}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to complete interview");
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  if (!interviewId) {
    navigate("/generate", { replace: true });
  }

  if (!interview) {
    navigate("/generate", { replace: true });
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <div className="flex items-center justify-between">
        <CustomBreadCrumb
          breadCrumbPage="Start"
          breadCrumpItems={[
            { label: "Mock Interviews", link: "/generate" },
            {
              label: interview?.position || "",
              link: `/generate/interview/${interview?.id}`,
            },
          ]}
        />
        
        {interview?.status !== 'completed' && (
          <Button 
            onClick={handleCompleteInterview}
            disabled={isCompleting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isCompleting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Interview
              </>
            )}
          </Button>
        )}
      </div>

      <div className="w-full">
        <Alert className="bg-sky-100 border border-sky-200 p-4 rounded-lg flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-sky-600" />
          <div>
            <AlertTitle className="text-sky-800 font-semibold">
              Important Note
            </AlertTitle>
            <AlertDescription className="text-sm text-sky-700 mt-1 leading-relaxed">
              Press "Record Answer" to begin answering the question. Once you
              finish the interview, you&apos;ll receive feedback comparing your
              responses with the ideal answers.
              <br />
              <br />
              <strong>Note:</strong>{" "}
              <span className="font-medium">Your video is never recorded.</span>{" "}
              You can disable the webcam anytime if preferred.
            </AlertDescription>
          </div>
        </Alert>
      </div>

      {interview?.questions && interview?.questions.length > 0 && (
        <div className="mt-4 w-full flex flex-col items-start gap-4">
          <QuestionSection questions={interview?.questions} />
        </div>
      )}
    </div>
  );
};
