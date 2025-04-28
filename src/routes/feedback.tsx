import { db } from "@/config/firebase.config";
import { Interview, UserAnswer } from "@/types";
import { useAuth } from "@clerk/clerk-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { LoaderPage } from "./loader-page";
import { CustomBreadCrumb } from "@/components/custom-bread-crumb";
import { Headings } from "@/components/headings";
import { InterviewPin } from "@/components/pin";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { CircleCheck, Star } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export const Feedback = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<UserAnswer[]>([]);
  const [activeFeed, setActiveFeed] = useState("");
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [attemptGroups, setAttemptGroups] = useState<{[key: string]: UserAnswer[]}>({});

  if (!interviewId) {
    navigate("/generate", { replace: true });
  }
  useEffect(() => {
    if (interviewId) {
      const fetchInterview = async () => {
        if (interviewId) {
          try {
            const interviewDoc = await getDoc(
              doc(db, "interviews", interviewId)
            );
            if (interviewDoc.exists()) {
              const data = interviewDoc.data();
              setInterview({
                id: interviewDoc.id,
                ...data,
              } as Interview);

              // If interview is not completed, redirect to interview page
              if (data.status !== 'completed') {
                toast.error("Interview not completed", {
                  description: "Please complete the interview first to view feedback."
                });
                navigate(`/generate/interview/${interviewId}`);
                return;
              }
            }
          } catch (error) {
            console.log(error);
          }
        }
      };

      const fetchFeedbacks = async () => {
        setIsLoading(true);
        try {
          const querSanpRef = query(
            collection(db, "userAnswers"),
            where("userId", "==", userId),
            where("mockIdRef", "==", interviewId),
            orderBy("attemptNumber", "asc"),
            orderBy("timestamp", "desc")
          );

          const querySnap = await getDocs(querSanpRef);

          const interviewData: UserAnswer[] = querySnap.docs.map((doc) => {
            return { id: doc.id, ...doc.data() } as UserAnswer;
          });

          // Group by attempt number
          const groups = interviewData.reduce((acc, answer) => {
            const attemptKey = `Attempt ${answer.attemptNumber}`;
            if (!acc[attemptKey]) {
              acc[attemptKey] = [];
            }
            acc[attemptKey].push(answer);
            return acc;
          }, {} as {[key: string]: UserAnswer[]});

          setAttemptGroups(groups);
          setFeedbacks(interviewData);
        } catch (error) {
          console.log(error);
          toast.error("Error", {
            description: "Something went wrong. Please try again later.",
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchInterview();
      fetchFeedbacks();
    }
  }, [interviewId, navigate, userId]);

  //   calculate the ratings out of 10

  const overAllRating = useMemo(() => {
    if (feedbacks.length === 0) return "0.0";

    const totalRatings = feedbacks.reduce(
      (acc, feedback) => acc + feedback.rating,
      0
    );

    return (totalRatings / feedbacks.length).toFixed(1);
  }, [feedbacks]);

  const performanceData = useMemo(() => {
    return Object.entries(attemptGroups).map(([attempt, answers]) => {
      const avgRating = answers.reduce((acc, curr) => acc + curr.rating, 0) / answers.length;
      const timestamp = answers[0]?.timestamp?.toDate() || new Date();
      
      return {
        attempt,
        rating: Number(avgRating.toFixed(1)),
        date: format(timestamp, 'MMM dd, yyyy')
      };
    });
  }, [attemptGroups]);

  if (isLoading) {
    return <LoaderPage className="w-full h-[70vh]" />;
  }

  return (
    <div className="flex flex-col w-full gap-8 py-5">
      <div className="flex items-center justify-between w-full gap-2">
        <CustomBreadCrumb
          breadCrumbPage={"Feedback"}
          breadCrumpItems={[
            { label: "Mock Interviews", link: "/generate" },
            {
              label: `${interview?.position}`,
              link: `/generate/interview/${interview?.id}`,
            },
          ]}
        />
      </div>

      <Headings
        title="Congratulations !"
        description="Your personalized feedback is now available. Dive in to see your strengths, areas for improvement, and tips to help you ace your next interview."
      />

      <p className="text-base text-muted-foreground">
        Your overall interview ratings :{" "}
        <span className="text-emerald-500 font-semibold text-xl">
          {overAllRating} / 10
        </span>
      </p>

      {interview && <InterviewPin interview={interview} onMockPage />}

      <Headings title="Interview Feedback" isSubHeading />

      <div className="w-full h-[300px] bg-white p-4 rounded-lg shadow-md">
        <Headings title="Performance Over Time" isSubHeading />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={performanceData}>
            <XAxis dataKey="date" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Line type="monotone" dataKey="rating" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {Object.entries(attemptGroups).map(([attempt, answers]) => (
        <div key={attempt}>
          <Headings title={attempt} isSubHeading />
          <Accordion type="single" collapsible className="space-y-6">
            {answers.map((feed) => (
              <AccordionItem
                key={feed.id}
                value={feed.id}
                className="border rounded-lg shadow-md"
              >
                <AccordionTrigger
                  onClick={() => setActiveFeed(feed.id)}
                  className={cn(
                    "px-5 py-3 flex items-center justify-between text-base rounded-t-lg transition-colors hover:no-underline",
                    activeFeed === feed.id
                      ? "bg-gradient-to-r from-purple-50 to-blue-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <span>{feed.question}</span>
                </AccordionTrigger>

                <AccordionContent className="px-5 py-6 bg-white rounded-b-lg space-y-5 shadow-inner">
                  <div className="text-lg font-semibold to-gray-700">
                    <Star className="inline mr-2 text-yellow-400" />
                    Rating : {feed.rating}
                  </div>

                  <Card className="border-none space-y-3 p-4 bg-green-50 rounded-lg shadow-md">
                    <CardTitle className="flex items-center text-lg">
                      <CircleCheck className="mr-2 text-green-600" />
                      Expected Answer
                    </CardTitle>

                    <CardDescription className="font-medium text-gray-700">
                      {feed.correct_ans}
                    </CardDescription>
                  </Card>

                  <Card className="border-none space-y-3 p-4 bg-yellow-50 rounded-lg shadow-md">
                    <CardTitle className="flex items-center text-lg">
                      <CircleCheck className="mr-2 text-yellow-600" />
                      Your Answer
                    </CardTitle>

                    <CardDescription className="font-medium text-gray-700">
                      {feed.user_ans}
                    </CardDescription>
                  </Card>

                  <Card className="border-none space-y-3 p-4 bg-red-50 rounded-lg shadow-md">
                    <CardTitle className="flex items-center text-lg">
                      <CircleCheck className="mr-2 text-red-600" />
                      Feedback
                    </CardTitle>

                    <CardDescription className="font-medium text-gray-700">
                      {feed.feedback}
                    </CardDescription>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
};
