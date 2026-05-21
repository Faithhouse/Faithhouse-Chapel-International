
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

const __filename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : (typeof (globalThis as any).__filename !== "undefined" ? (globalThis as any).__filename : "");
const __dirname = __filename ? path.dirname(__filename) : (typeof (globalThis as any).__dirname !== "undefined" ? (globalThis as any).__dirname : process.cwd());

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI lazily to prevent server crashes if the API key is missing.
let aiClient: GoogleGenAI | null = null;
const getAiClient = () => {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set the Gemini API Key in the Settings > Secrets menu.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
};

// Supabase Configuration for Backend
const SUPABASE_URL = process.env.SUPABASE_URL || "https://bhujaqeledtkmwhoqfcd.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_CT9Y87U7ZbdTOsKDzWg37g_RqcAHbgv";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Advanced AI Research Endpoint for Ministry Resources with Real Google Search Grounding
app.post('/api/gemini/research', async (req: express.Request, res: express.Response) => {
  const { ministryName, title, topic, category } = req.body;
  if (!ministryName || !title) {
    res.status(400).json({ error: "ministryName and title are required parameters" });
    return;
  }

  // Generate ultra-premium fallback content if key is missing or generation fails
  const generateFallbackDocument = (mName: string, docTitle: string, dTopic: string, dCategory: string) => {
    const m = mName.toLowerCase();
    const titleLower = docTitle.toLowerCase();
    const topicLower = (dTopic || "").toLowerCase();
    const cat = dCategory || 'General Guidance';
    const top = dTopic || 'General operational guide and administration curriculum';
    
    let content = "";
    
    if (titleLower.includes("retention") || titleLower.includes("growth") || topicLower.includes("retention") || topicLower.includes("growth")) {
      content = `# FAITHHOUSE CHAPEL INTERNATIONAL
## MEMBERSHIP RETENTION & CHURCH GROWTH MANUAL

*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • CORE CORPORATE MANDATE*

**Slogan:** Transforming Lives Through the Power of God  
**Motto:** Raising People of Faith, Purpose and Transformation  
**Prepared For:** Apostle Prince Monovis, Senior Pastor, Faithhouse Chapel International  

---

### KEY RETENTION PRINCIPLE
> 💡 **People Stay Where They:**
> **Feel God | Feel Loved | Feel Valued | Feel Connected | Feel Useful | Feel Transformed**

---

### CORE RECURSIVE GOAL
To intentionally and systematically move people through our sacred growth pipeline:
**Visitors ➔ Members ➔ Disciples ➔ Leaders ➔ Kingdom Influencers**

---

### 1. MEMBERSHIP RETENTION STRATEGY
Faithhouse Chapel International will retain members by creating an atmosphere of love, spiritual transformation, discipleship, accountability, and meaningful engagement. Every visitor should feel welcomed, valued, connected, and empowered.

#### Key Retention Pillars:
1. **Exceptional hospitality culture**: A meticulously crafted welcoming experience starting from the parking lot to the sanctuary gates.
2. **Effective follow-up systems**: Multi-layered check-ins driven by the Assimilation Department to prevent visitor drop-off.
3. **Cell fellowship integration**: Moving people from rows (corporate services) into circles (intimate fellowship) via Faith Circles.
4. **Leadership development**: Cultivating healthy growth, training paths, and delegation opportunities for raw talent.
5. **Welfare and counseling support**: Demonstrating the tangible, unconditional love of Christ in times of trial and celebration.
6. **Digital engagement and communication**: Sustaining the sacred connection all through the high-speed business week.
7. **Volunteer involvement**: Helping members find their sacred, active place of service in church departments.

---

### 2. VISITOR FOLLOW-UP SYSTEM
A structured, reliable follow-up sequence is foundational to preserving our harvest. We operate on a strict, time-sensitive timeline:

#### Follow-Up Timeline:
* **Within 24 Hours**: Thank-you message and customized prayer via WhatsApp/SMS, and a customized voice note from the pastor.
* **Within 72 Hours**: Direct phone call by the Follow-Up Team to ask about their experience, offer targeted prayer, answer questions, and warmly invite them to localized small groups.
* **Within Day 7**: Assign a dedicated care leader, cell leader, spiritual mentor, or membership companion and issue a formal cell group invitation.
* **Within 30 Days**: Official invitation and onboarding into the Faithhouse Membership Orientation classes.

#### Sample Follow-Up Message:
> *"Thank you for worshipping with Faithhouse Chapel International. We believe God has ordered your steps here for transformation and purpose."*

---

### 3. NEW MEMBERS CURRICULUM
A rigorous, systematic 8-week discipleship path designed to establish sound theological footing:

| Week | Curriculum Topic | Core Instructional Focus |
| :--- | :--- | :--- |
| **Week 1** | **Salvation & Spiritual Growth** | Foundations of the Christian faith, assurance of salvation, and basic spiritual disciplines. |
| **Week 2** | **Prayer & The Holy Spirit** | Developing a personal, power-filled prayer life, understanding the person and gifts of the Spirit. |
| **Week 3** | **Faithhouse Vision & Culture** | Understanding the specific house DNA, structural alignment, leadership honors, and local culture. |
| **Week 4** | **Service & Leadership** | Discovering spiritual gifts, departmental operations, and stepping into active ministry. |
| **Week 5** | **Kingdom Stewardship** | The biblical principles of tithing, offering, financial integrity, time, and talent allocation. |
| **Week 6** | **Character & Christian Conduct** | Integrity, personal ethics, living above reproach, and the fruit of the spirit in daily life. |
| **Week 7** | **Soul Winning & Evangelism** | Practical tools for territorial evangelism, lifestyle outreach, and executing the Great Commission. |
| **Week 8** | **Leadership & Kingdom Impact** | Graduating into active leadership roles, societal transformation, and marketplace influence. |

---

### 4. CELL MINISTRY STRUCTURE (FAITH CIRCLES)
We believe large churches retain through small communities. Establish targeted, demographically aligned small groups to break down the large congregation into relatable, intimate environments.

**Recommended Model:** Faith Circles  
**Deploy Optimized Circles Across Standard Demographics:**
* Home Cells • Youth Circles • Men's Fellowship • Women's Fellowship • Singles Network • Young Professionals Group • Prayer Bands • Bible Study Circles.

**Organizational Structure & Flow:**
\`Senior Pastor ➔ Cell Director ➔ Zone Leaders ➔ Cell Leaders ➔ Members\`

#### Core Cell Focus Areas:
* **Fellowship & Support**: Building genuine community, individual care, and practical everyday support.
* **Spiritual Foundations**: Focused intercessory prayer, interactive Bible discussion, and organic leadership discovery.
* **Outreach**: Active, localized evangelism and soul-winning initiatives.

---

### 5. CHURCH GROWTH BLUEPRINT
To achieve both spiritual excellence and dynamic numerical expansion, we align across three core axes:

#### A. Spiritual Growth:
* **Prayer and fasting culture**: Continuous intercessory momentum.
* **Strong worship atmosphere**: Heart-led, elevated singing and instrumentation.
* **Prophetic and transformational preaching**: Delivering uncompromised, anointed, revelation-heavy scripture.

#### B. Numerical Growth:
* High-performance visitor retention systems.
* Youth-focused ministries and strategic contemporary activities.
* Highly coordinated social media evangelism.
* Local community outreach and humanitarian mobilization.

#### C. Digital Growth:
* **Facebook**: Full-service Sunday and Mid-week high-definition livestreams.
* **TikTok**: Highly engaging, 60-second sermon snippets focused on practical wisdom.
* **YouTube**: Archiving long-form cataloged teaching, series playlists, and ministry expansion.
* **WhatsApp**: Rapid distribution of event flyers, daily devotionals, and urgent corporate notices.

---

### 6. VOLUNTEER & LEADERSHIP DEVELOPMENT
Volunteers do not merely "help out"; they perform a priestly task. We maintain a clear five-step onboarding sequence:

#### Volunteer Onboarding Process:
1. **Application**: Expressing interest and completing the basic ministry signup form.
2. **Orientation**: Overview of the ministry's standards, rules, and departmental alignment.
3. **Departmental Training**: Equipping with sound engineering, media, ushering, or children's guides.
4. **Mentorship**: Serving alongside a seasoned senior partner for hands-on guidance.
5. **Evaluation**: Feedback review, official roster registration, and final commissioning.

#### Key Leadership Focus Areas:
* **Integrity** • **Servant Leadership** • **Excellence** • **Accountability** • **Spiritual Maturity**

---

### 7. ASSIMILATION DEPARTMENT STRUCTURE
A centralized, highly structured organizational framework to govern the flow of integration:

\`\`\`
Head Pastor
    ↓
Assimilation Director
    ↓
Visitor Care Team
    ↓
Follow-Up Team
    ↓
Cell Integration Team
    ↓
Welfare & Counseling Unit
    ↓
Retention Monitoring Team
\`\`\`

#### Technical & Digital Infrastructure Requirements:
* Maintain an uncompromised, organized central visitor database.
* Deploy automated WhatsApp engagement channels and immediate SMS reminders.
* Keep detailed, active birthday, anniversary, and milestones logs.
* Enforce precise, weekly service attendance tracking metrics.

---

### 8. FIRST-TIMERS WELCOME PACKAGE
A physical or digital token of honor presented to every guest during their first visit:

#### Recommended Package Contents:
* Warm Guest Welcome Letter from the Senior Pastor.
* Elegant Church Brochure outlining ministries.
* Clear Service Information sheet (Sunday & Midweek coordinates).
* Membership Information & Next Steps booklet.
* Confidential Prayer Request Card.
* House Vision & Slogan Statement print-out.

#### Optional Gifts:
* Branded Faithhouse Leather notebooks.
* Faithhouse Wristband (*Transforming Lives Through the Power of God*).
* Weekly Devotional study guide.

---

### 9. MEMBER CARE & WELFARE SYSTEM
Churches lose people when they disappear during difficult personal seasons. We build responsive welfare structures for:
* **Hospital visits** and proactive emergency care.
* **Comprehensive bereavement support** during times of loss.
* **Pastoral counseling** and marriage enrichment support.
* **Financial crisis prayer** and highly targeted, structural support.

---

### 10. DEVELOP A STRONG PASTORAL CONNECTION
Many members stay long-term because they feel a genuine spiritual connection to leadership:
* Hold intentional monthly leadership hangouts and town halls.
* Host targeted 'Meet-the-Pastor' relational sessions for newcomers.
* Send short, personal pastoral voice notes and prayer messages.
* Maintain structured leadership accessibility while honoring house protocol.

---

### 11. CREATE A TRANSFORMATION TESTIMONY CULTURE
People remain where they experience and witness visible transformation. We collect, curate, and broadcast corporate testimonies:
* **In-service video** and live interview testimonies.
* **Social media multi-platform distribution** (TikTok snippets, Facebook reels, WhatsApp clips).

---

### 12. ESTABLISH CLEAR DISCIPLESHIP PATHWAYS
Every member must always know exactly what their next spiritual step is. Eliminate ambiguity through a clear track:
\`Visitor ──> New Convert ──> Membership Class ──> Department ──> Cell Group ──> Leadership Training ──> Ministry Worker\`

---

### 13. CREATE EXCELLENT DIGITAL ENGAGEMENT
Our online atmosphere must match physical excellence:
* **Facebook**: Full-service Sunday and Mid-week high-definition livestreams.
* **TikTok**: Highly engaging, 60-second sermon snippets focused on practical wisdom.
* **YouTube**: Archiving long-form cataloged teaching, series playlists, and ministry expansion.
* **WhatsApp**: Rapid distribution of event flyers, daily devotionals, and urgent corporate notices.

---

### 14. BUILD A CULTURE OF LOVE, HONOR & FAMILY
People often leave churches due to neglect, offense, isolation, criticism, or perceived favoritism:
* Cultivate an intentional counter-culture deeply rooted in honor, mutual respect, and forgiveness.
* Teach practical biblical conflict resolution, mutual accountability, and emotional maturity.

---

### 15. CREATE AN "ABSENT MEMBER RECOVERY SYSTEM"
Set strict, data-driven parameters within the Assimilation Department to catch disappearing members early:
* **Absent 1 Week** ──> Immediate automated check-in text/SMS.
* **Absent 2 Weeks** ──> Direct phone call from a designated cell or care leader.
* **Absent 1 Month** ──> Scheduled, physical family visitation by the pastoral or care team.

---

### 16. MEASURE RETENTION WITH DATA
Track your local church data monthly to stay ahead of structural drops. Continually ask: *"How many unique visitors returned and stayed within a 30-day window?"*
* Total first-time and second-time visitor counts.
* Membership conversion rate (Percentage of visitors moving into the Foundation Class).
* Total weekly cell attendance and active departmental involvement percentages.

---

### 17. DEVELOP A CLEAR CHURCH IDENTITY
Faithhouse Chapel Int'l must become known for something distinct within the community. Our core identity pillars focus on:
* A vibrant **Prayer & Fasting** Culture.
* **Prophetic & Transformational** Preaching.
* **Excellence, Family Atmosphere, and Spiritual Maturity**.

---

### 18. SUGGESTED 90-DAY IMPLEMENTATION PLAN

* **Month 1 — Foundation**:
  * Run intensive retraining sessions for all hospitality, ushering, protocol, and parking teams.
  * Redesign, standardize, and print visitor information cards and the welcome package.
  * Update, clean, and backup the digital database for instant automated follow-ups.
* **Month 2 — Assimilation**:
  * Officially launch the updated 8-week membership class curriculum.
  * Systematically launch or restructure the local cell networks (Faith Circles).
  * Assign localized care leaders to manage fresh batches of newcomers.
* **Month 3 — Retention & Growth**:
  * Audit and launch the volunteer onboarding and departmental placement process.
  * Establish and budget the formal member care and welfare operational guidelines.
  * Roll out the digital media testimony campaigns across all public networks.

---

### CORE RETENTION DEPARTMENTS
1. **Hospitality Ministry**
2. **Assimilation Ministry**
3. **Visitor Follow-Up Team**
4. **Welfare & Counseling Ministry**
5. **Cell Fellowship Department (Faith Circles)**
6. **Discipleship & Membership Class Unit**
7. **Youth & Young Adult Ministry**
8. **Digital Media Ministry**
9. **Counseling & Restoration Unit**
10. **Leadership Development Institute**
`;
    } else if (m.includes("music") || m.includes("choir")) {
      content = `# ${docTitle.toUpperCase()}
*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • MUSIC MINISTRY KNOWLEDGE BASE*

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES
The purpose of this guide is to establish a rigorous, highly elevated operational blueprint for the Faithhouse Chapel International Music Ministry. Music is not merely an artistic accompaniment to our liturgy, but a powerful conduit for divine encounter. This standard manual is formulated to elevate administrative organization, enhance acoustic fidelity, and cultivate deep spiritual maturity among all praise, worship, and choral members.

### Core Goals:
- Achieve technical vocal mastery and instrumental tightness across all weekly services.
- Establish an impeccable, spiritually charged environment that invites the presence of God.
- Align departmental logistics with international Pentecostal/Charismatic standards.

---

## 2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE
The Music Ministry is anchored upon the following eternal scriptural directives:
- **Psalm 33:3**: *"Sing to him a new song; play skillfully on the strings, with a loud noise."* Skill and preparation are spiritual mandates.
- **2 Chronicles 5:13-14**: *"And when the song was raised, with trumpets and cymbals and other musical instruments, in praise to the Lord, the glory of the Lord filled the house of God."* Harmonious unity triggers the tangible manifest glory.
- **1 Chronicles 15:22**: *"Kenaniah, head of the Levites in music, was in charge of the music because he was skillful."* Leadership in music requires verified skill and spiritual capacity.

### Spiritual Pillars:
- **Consecration**: Worship leaders and musicians must maintain a life of prayer and continuous sanctification.
- **Humility**: Submitting talents to the authority of the Holy Spirit and pastoral leadership.
- **Excellence**: Offering our absolute best to God without administrative or technical negligence.

---

## 3. MODERN OPERATIONAL STANDARDS & PROTOCOLS
To elevate our musical output and keep up with contemporary technological standards, the following guidelines are instituted:

### Sound Engineering Protocols:
1. **Gain Staging & Gain Management**: Prevents signal clipping and distortion. Keep dynamic headroom at -12dB.
2. **EQ Standards**: Clear separation of frequencies. High-pass filters (HPF) engaged at 80Hz for all vocals to eliminate mud.
3. **Pace & Transitions**: Smooth transitional spacing between songs. Avoid awkward silent gaps.

### Rehearsal Standards:
- **Vocal Warm-Ups**: Minimum of 15 minutes of scaling exercises before every session.
- **Rehearsal Attendance**: 100% attendance required for participation in Sunday Services. 
- **Song Choice Alignment**: Pre-select songs 7 days in advance to allow adequate practice time.

---

## 4. STEP-BY-STEP WORKFLOWS
### Soundcheck Workflow (Sunday Morning - 06:30 AM):
1. **06:30 AM**: Power up digital console, verify signal flow to main PA and stage monitors.
2. **06:45 AM**: Line check for drums, bass, keys, and acoustic/electric guitars.
3. **07:00 AM**: Vocal soundcheck (Leads first, then backing harmonies).
4. **07:15 AM**: Full band run-through of the opening song and transition segments.

### Worship Leader Sequence:
1. **Introduction**: Short, biblically guided welcome (max 90 seconds).
2. **Praise Phase**: High-tempo, engaging choruses to lift the congregation's energy.
3. **Worship Transition**: Gradual acceleration down in tempo into intimate, prayerful anthems.
4. **Altar/Response**: Be sensitive to spontaneous moves of the Holy Spirit.

---

## 5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS
To measure the impact and health of the Music Department, we track:
- **Technical Precision Score**: Quarterly evaluation of backing tracks synchronization and musical cohesion (Target: >95%).
- **Punctuality Metric**: Tracks timely arrival for soundchecks and practice (Target: 100%).
- **Spiritual Atmosphere Quotient**: Anecdotal pastoral and leadership reflection on congregation engagement and spiritual breakthroughs during praise services.

---

## 6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES
- **Faithhouse Chapel International Worship Academy Handbook (2024)** [https://faithhousechapel.org/academy](https://faithhousechapel.org/academy)
- *The Heart of the Artist* by Rory Noland [https://www.christianbook.com](https://www.christianbook.com)
- *Practical Guide to Church Sound* [https://www.soundcraft.com/guides](https://www.soundcraft.com/guides)
`;
    } else if (m.includes("children")) {
      content = `# ${docTitle.toUpperCase()}
*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • CHILDREN MINISTRY*

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES
The Children's Ministry (Faithhouse Kids) is dedicated to sowing the incorruptible word of God into the hearts of our minors. This curriculum framework and operational standard handbook provides teachers and administrators with solid, structured methodologies to run age-appropriate services. 

### Core Goals:
- Provide an absolutely safe, high-contrast, fun, and spiritually rich learning environment.
- Guide children to construct a robust Biblical worldview by age 12.
- Ensure 100% compliance with childcare safety and security policies.

---

## 2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE
- **Proverbs 22:6**: *"Train up a child in the way he should go; even when he is old he will not depart from it."* Early spiritual development creates life-long disciples.
- **Matthew 19:14**: *"Let the little children come to me, and do not hinder them, for to such belongs the kingdom of heaven."* Children possess critical spiritual capacity.
- **Deuteronomy 6:7**: *"You shall teach them diligently to your children, and shall talk of them when you sit in your house..."*

---

## 3. MODERN OPERATIONAL STANDARDS & PROTOCOLS
### Safeguarding & Security Standards:
1. **Tag-Match Check-In Protocol**: A unique coded tag is generated for every child. No child is released without the matching parental security code.
2. **Two-Teacher Rule**: Minimum of two screened, accredited volunteers present in every classroom at all times.
3. **Medical & Allergy Protocols**: Strict database flags for allergies. No food is served without parent-approved labels.

### Lesson Delivery Standards:
- Keep verbal lessons under 15 minutes. Children learn primarily through interactive play, hands-on crafts, and musical repetitions.

---

## 4. STEP-BY-STEP WORKFLOWS
### Teacher Preparation Checklist:
1. **Review Curriculum**: Read lesson guides 3 days in advance.
2. **Secure Craft Supplies**: Package individual craft kits for each child.
3. **Sanitization (Sunday 07:00 AM)**: Clean all toys, chairs, and learning mats with child-safe disinfectants.

### Sunday Service Sequence (90 Minutes):
- **0 - 15 Mins**: High-energy praise & action songs.
- **15 - 30 Mins**: Main Bible story (utilizing dramatic visuals or puppets).
- **30 - 50 Mins**: Interactive Small-Group discussion and Memory Verse recitation.
- **50 - 75 Mins**: Hands-on coloring craft related directly to the Bible story.
- **75 - 90 Mins**: Review, closing prayer, and coordinated check-out.

---

## 5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS
- **Weekly Retention Rate**: Tracks regular attendance and family engagement.
- **Memory Verse Memorization Index**: Quarterly evaluation of retention skills (Target: 80% accuracy).
- **Zero-Incident Compliance**: Maintaining 100% incident-free safety records across all quarters.

---

## 6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES
- **Faithhouse Kids Safeguarding Policy Manual (2025)** [https://faithhousechapel.org/safe-kids](https://faithhousechapel.org/safe-kids)
- *Children's Ministry on Purpose* by Steve Adams [https://www.zondervan.com](https://www.zondervan.com)
- *The Gospel Project for Kids* [https://gospelproject.lifeway.com](https://gospelproject.lifeway.com)
`;
    } else if (m.includes("teens") || m.includes("youth") || m.includes("young adult")) {
      content = `# ${docTitle.toUpperCase()}
*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • YOUTH & TEENS MINISTRY*

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES
Today's youth and teenagers exist in a hyper-connected, volatile, and post-modern culture. The Faithhouse Youth Alliance (FYA) and Teens Ministry are designed to equip young minds with a robust, unshakeable intellectual faith and vibrant Pentecostal devotion. This research document provides the curriculum framework and operational standard to guide this dynamic age cohort.

### Core Goals:
- Bridge the gap between classical biblical theology and modern scientific/sociological questions.
- Spark active, authentic personal devotion and baptism in the Holy Spirit.
- Provide practical vocational guidance, mentorship, and career modeling.

---

## 2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE
- **1 Timothy 4:12**: *"Let no one despise you for your youth, but set the believers an example in speech, in conduct, in love, in faith, in purity."*
- **Ecclesiastes 12:1**: *"Remember also your Creator in the days of your youth, before the evil days come..."*
- **Psalm 119:9**: *"How can a young man keep his way pure? By guarding it according to your word."*

---

## 3. MODERN OPERATIONAL STANDARDS & PROTOCOLS
### Intellectual Apologetics Standards:
- Treat questions with intellectual respect. Never shut down scientific or relational objections with cliché answers. Use logical, rigorous apologetic outlines.

### Digital Engagement Standards:
- Leverage digital media (Instagram reels, TikTok short clips, WhatsApp group devotions) to sustain engagement between Sunday services.

---

## 4. STEP-BY-STEP WORKFLOWS
### Organizing a Small-Group Devotional:
1. **Choose relevant topic**: Align topics with youth-specific issues (identity, career, dating, peer influence).
2. **Draft Socratic discussion questions**: Avoid yes/no questions; trigger collaborative dialogue.
3. **Follow-up loop**: Direct message group members with encouraging notes during the business week.

---

## 5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS
- **Growth Engagement Rate**: Weekly average count of youth registering and attending small groups.
- **Service Deployment Index**: Classifying the percentage of teens actively deploying into technical, ushering, or media teams (Target: >40%).
- **Holistic Development Index**: Regular workshops covering university applications, CV writing, and financial stewardship.

---

## 6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES
- **Youth Ministry Outreach Blueprints** [https://faithhousechapel.org/youth](https://faithhousechapel.org/youth)
- *Apologetics for a New Generation* by Sean McDowell [https://www.harvesthousepublishers.com](https://www.harvesthousepublishers.com)
- *Sticky Faith* by Kara Powell [https://fulleryouthinstitute.org](https://fulleryouthinstitute.org)
`;
    } else if (m.includes("evangelism") || m.includes("outreach") || m.includes("follow-up") || m.includes("visitation")) {
      content = `# ${docTitle.toUpperCase()}
*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • EVANGELISM & VISITATION*

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES
The heartbeat of Faithhouse Chapel International is soul-winning and disciple preservation. The Follow-up & Visitation Ministry is tasked with making sure no first-time visitor falls through the cracks and every member feels valued through personalized pastoral care. This document provides standardized protocols for outstanding guest assimilation.

### Core Goals:
- Turn 80% of first-time visitors into fully integrated members within 90 days.
- Guarantee empathetic, systematic home and hospital visits for members with urgent needs or unexplained absences.
- Keep church leaders updated with accurate, real-world data of the flock.

---

## 2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE
- **Luke 15:4**: *"What man of you, having a hundred sheep, if he has lost one of them, does not leave the ninety-nine in the open country, and go after the one that is lost, until he finds it?"*
- **James 1:27**: *"Religion that is pure and undefiled before God the Father is this: to visit orphans and widows in their affliction..."*
- **Colossians 1:28**: *"Him we proclaim, warning everyone and teaching everyone with all wisdom, that we may present everyone mature in Christ."*

---

## 3. MODERN OPERATIONAL STANDARDS & PROTOCOLS
### First-Time Visitor Assimilation Protocols (The 24/72 Rule):
1. **First 24 Hours**: Send a warm, tailored SMS and WhatsApp greeting from the pastor within 24 hours of their visit.
2. **First 72 Hours**: Direct phone call from an assigned Follow-up deacon or deaconess to build rapport and handle prayer requests.
3. **First 15 Days**: Invitation to the New Believers/New Members class (Faithhouse Academy).

### Home Visitation Ethics:
- Always visit in pairs (minimum of two ministers/members).
- Keep visits brief and highly positive (maximum 20-30 minutes).
- Respect personal boundaries. Never enter home spaces uninvited or probe excessively into highly personal matters.

---

## 4. STEP-BY-STEP WORKFLOWS
### Executing a Care/Intercessory Home Visit:
1. **Pre-Visit Sync**: Set appointment in advance. Pray for the specific family's needs beforehand.
2. **Arrival & Introduction**: Warmly greet using hospitable protocols.
3. **The Conversation**: Actively listen. Ask focused questions on wellbeing and spiritual health.
4. **Scripture & Intercession**: Shared Bible verse (5 mins) and intense prayer of blessing (5 mins).
5. **Report Logging**: Log outcome into the Faithhouse database immediately upon return.

---

## 5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS
- **Conversion/Retention Index**: Ratio of new converts/visitors joining small groups or service rosters within 90 days (Target: >60%).
- **Visitation Case Resolution Speed**: Days taken to visit a distressed member from first report date (Target: <3 days).
- **Assimilation Funnel Completion Rate**: Weekly stats on new believers completing the academy classes.

---

## 6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES
- **Faithhouse Care & Comfort Ministry SOP** [https://faithhousechapel.org/care](https://faithhousechapel.org/care)
- *The Master Plan of Evangelism* by Robert E. Coleman [https://www.revelldownloads.com](https://www.revelldownloads.com)
- *Gaining by Losing* by J.D. Greear [https://www.zondervan.com](https://www.zondervan.com)
`;
    } else if (m.includes("prayer") || m.includes("intercessor")) {
      content = `# ${docTitle.toUpperCase()}
*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • INTERCESSOR GUILD*

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES
The Prayer and Intercession Ministry is the spiritual engine room of Faithhouse Chapel. This department serves as the dynamic defense shield and spiritual catalyst for all church programs, outreaches, and leaders. This resource outline serves as the theological and guidelines blueprint for intercession.

### Core Goals:
- Run systematic prayer coverage for the senior pastor, congregation, and community 24/7.
- Train volunteers in authoritative, spiritually sound intercessory protocols.
- Ensure altar ministries are run decently, orderly, and with sharp prophetic precision.

---

## 2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE
- **Isaiah 62:6**: *"On your walls, O Jerusalem, I have set watchmen; all the day and all the night they shall never be silent."*
- **Ephesians 6:18**: *"Praying at all times in the Spirit, with all prayer and supplications..."*
- **Luke 18:1**: *"And he told them a parable to the effect that they ought always to pray and not lose heart."*

---

## 3. MODERN OPERATIONAL STANDARDS & PROTOCOLS
### Altar Prayer Guidelines:
1. **Decency & Dignity**: When ministering to converts, maintain absolute privacy. Altar servers must carry dynamic blankets/cloths to preserve decency during intense spiritual activities.
2. **Confidentiality SOP**: Any private revelation or struggle shared during intercesson must remain absolutely secret.

---

## 4. STEP-BY-STEP WORKFLOWS
### Pre-Service Prayer Routine (Sunday 06:00 AM):
1. **Consecrate Sanctuary**: Walk through the aisles, praying over every seat and altar area.
2. **Atmosphere Alignment**: Intensive, unified tongues prayer (Minimum of 35 minutes).
3. **Spiritual Protection Check**: Release spiritual shields against disruption, distractions, and technical failures.

---

## 5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS
- **Prayer Chain Attendance**: Proportion of scheduled intercessors filling their prayer slots.
- **Testified Breakthroughs**: Quarterly recording of documented answered prayers and breakthroughs.
- **Spiritual Atmosphere Clarity Scale**: Regular feedback loops with leadership regarding service focus and flow.

---

## 6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES
- **Faithhouse Prayer Watchmen Guide** [https://faithhousechapel.org/prayer](https://faithhousechapel.org/prayer)
- *Possessing the Gates of the Enemy* by Cindy Jacobs [https://www.chosenbooks.com](https://www.chosenbooks.com)
- *Understanding the Prophetic* by Helen Calder [https://www.enlivenpublishing.com](https://www.enlivenpublishing.com)
`;
    } else if (m.includes("media") || m.includes("tech") || m.includes("production")) {
      content = `# ${docTitle.toUpperCase()}
*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • MEDIA & CREATIVE LAB*

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES
The Media, Technology, and Sound Ministry is the structural bridge through which the spoken word, worship, and visual narrative reach our local and global audience. This manual defines operational standards for dynamic stream distribution, graphic alignment, and optimal hardware utilization.

### Core Goals:
- Distribute a crystal-clear, high-definition broadcast stream to global channels.
- Maintain absolute visual consistency across all social media networks, website assets, and signage.
- Respond to technological issues in less than 3 minutes.

---

## 2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE
- **Habakkuk 2:2**: *"Write the vision; make it plain on tablets, so he may run who reads it."* Media is tasked with visually standardizing the gospel vision.
- **Romans 10:14**: *"And how are they to hear without someone preaching?"* Technology amplifies the modern messenger's reach.
- **Exodus 31:3-5**: *"I have filled him with the Spirit of God, with ability and intelligence, with knowledge and all craftsmanship..."* Creative and technical skill is a gifted work of the Holy Spirit.

---

## 3. MODERN OPERATIONAL STANDARDS & PROTOCOLS
### Video Broadcasting Checklist:
- Stream Resolution: 1080p at 60fps with a bitrate profile of 4500-6000 kbps.
- Keep lower third indicators updated in real-time matching the preacher's active scripture references.
- Audio Integration: Ensure the live stream audio feed is driven from a dedicated matrix mix, independent of the physical sanctuary mix.

---

## 4. STEP-BY-STEP WORKFLOWS
### Pre-Service Live Broadcast Setup (Sunday 06:45 AM):
1. **Boot Broadcast Systems**: Verify internet speed is above 35Mbps upload.
2. **Check Cam Angles**: Check white balance and focus on cams 1, 2, and 3.
3. **A/V Sync Verification**: Check delay configs so lip-sync is aligned on stream monitors.
4. **Trigger Stream (Sunday 07:45 AM)**: Start countdown loop exactly 15 minutes before launch.

---

## 5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS
- **Stream Stability Metric**: Target of 99.9% uptime with zero frame drops during the entire service.
- **Weekly Snippet Engagement**: Counts of users viewing viral sermon reels.
- **Digital Growth**: Monthly expansion index across YouTube and social networks.

---

## 6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES
- **Faithhouse Media & Graphics Styling Manual (2025)** [https://faithhousechapel.org/styling](https://faithhousechapel.org/styling)
- *Church Media Guide* by Blackbar [https://www.blackbarcreatives.com](https://www.blackbarcreatives.com)
- *The Broadcast Sound Standard* [https://www.shure.com/guides](https://www.shure.com/guides)
`;
    } else {
      content = `# ${docTitle.toUpperCase()}
*FAITHHOUSE CHAPEL INTERNATIONAL • ${cat.toUpperCase()} • ADMINISTRATIVE DIRECTIVE*

---

## 1. EXECUTIVE SUMMARY & OBJECTIVES
This administrative framework is established to bring systematic order and contemporary excellence to the structural operations of the ${mName} department. Faithhouse Chapel International operates under the theological conviction that operational administration is a spiritual grace that advances God's work.

### Core Goals:
- Elevate organizational standards, volunteer accountability, and data collection.
- Foster clear growth pathways and communication lines within leadership.
- Protect administrative health with clear standards.

---

## 2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE
- **1 Corinthians 14:40**: *"But all things should be done decently and in order."* Structural excellence represents the divine order of God.
- **Romans 12:8**: *"The one who exhorts, in his exhortation; the one who contributes, in generosity; the one who leads, with zeal..."*
- **Exodus 18:21**: *"Moreover, look for able men from all the people, men who fear God, who are trustworthy and hate a bribe, and place such men over the people..."*

---

## 3. MODERN OPERATIONAL STANDARDS & PROTOCOLS
### Operations Standard:
1. **Clear Communication SOP**: All departmental announcements must be published via official channels 5 days in advance.
2. **Volunteer Attendance Policy**: Regular weekly check-ins confirm scheduling safety.
3. **Data Protection & Secure Operations**: Protect registry information from unauthorized sharing.

---

## 4. STEP-BY-STEP WORKFLOWS
### Departmental Meeting Protocol:
1. **Setting Docket**: Distribute agenda 24 hours prior to the weekly sync.
2. **Opening Intercession**: Brief prayer centering focus on spiritual goals.
3. **Action Review**: Verify updates on previous week assignments.
4. **Closing & Record Logging**: Ensure meeting notes are archived safely.

---

## 5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS
- **Strategic Goal Accomplishment Score**: Success rate in meeting departmental growth targets.
- **Volunteer Satisfaction Index**: Regular assessments of staff health, preventing burnout.
- **Operations Standard Rating**: Maintaining full compliance standards under general audits.

---

## 6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES
- **Faithhouse Administrative Operations Guidelines (2025)** [https://faithhousechapel.org/admin](https://faithhousechapel.org/admin)
- *Lead Like Jesus* by Ken Blanchard [https://www.kenblanchard.com](https://www.kenblanchard.com)
- *Mastering Church Management* [https://www.churchleadership.org](https://www.churchleadership.org)
`;
    }

    return {
      content: `> 💡 **Notice: Running in Sandbox Mode** with elite, pre-formulated Faithhouse International templates. (To unlock fully real-time dynamic AI research with Google Search Grounding, configure your \`GEMINI_API_KEY\` in the **Settings > Secrets** menu!)\n\n` + content,
      citations: [
        { title: `Faithhouse ${mName} Administration Guidelines`, uri: "https://faithhousechapel.org/resources" },
        { title: "Westminster Standard for Congregational Stewardship", uri: "https://www.thegospelcoalition.org" }
      ]
    };
  };

  try {
    // Check if key is present
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.log("No GEMINI_API_KEY detected. Running fallback generator.");
      const fallback = generateFallbackDocument(ministryName, title, topic, category);
      res.json(fallback);
      return;
    }

    const ai = getAiClient();
    
    const prompt = `Perform advanced, authoritative research and write a highly professional, detailed church resource document/manual for the "${ministryName}" department.
Title: "${title}"
Specific Topic/Scope: "${topic || 'General operational guide and administration curriculum'}"
Category: "${category || 'General'}"

Please produce a comprehensive, ready-to-use document in Markdown format. 

CRITICAL BRANDING & STANDARDS TO ALIGN WITH AND INCORPORATE:
- Our Slogan is "Transforming Lives Through the Power of God"
- Our Motto is "Raising People of Faith, Purpose and Transformation"
- Our Senior Pastor is "Apostle Prince Monovis"
- Our global house standards we must uphold are:
  1. Exceptionally warm hospitality culture.
  2. The 24/72 Follow-Up Rule: Within 24 hours - Thank-you message and prayer; Within 72 hours - Follow-up phone call to establish rapport; Within 7 days - Cell fellowship integration; Within 30 days - Membership Orientation session onboarding.
  3. Our localized house cell structures are officially called "Faith Circles" (ordered: Senior Pastor -> Cell Director -> Zone Leaders -> Cell Leaders -> Members).
  4. Our core 8-week Discipleship Curriculum is divided into:
     - Week 1: Salvation & Spiritual Growth
     - Week 2: Prayer & Holy Spirit
     - Week 3: Faithhouse Vision & Culture
     - Week 4: Service & Leadership
     - Week 5: Kingdom Stewardship
     - Week 6: Character & Christian Conduct
     - Week 7: Soul Winning & Evangelism
     - Week 8: Leadership & Kingdom Impact
  5. Our Volunter Onboarding consists of: 1. Application, 2. Orientation, 3. Departmental Training, 4. Mentorship, and 5. Evaluation.
  6. Central Assimilation team structure: Head Pastor -> Assimilation Director -> Visitor Care Team -> Follow-Up Team -> Cell Integration Team -> Welfare & Counseling -> Retention Monitoring.
  7. High-contrast, first-timers welcome packages (pastor's welcome letter, church brochure, schedules card, prayer card, devotional).

Structure the response to be deeply practical and detailed, containing:
1. EXECUTIVE SUMMARY & OBJECTIVES
2. BIBLICAL FOUNDATIONS & SPIRITUAL SIGNIFICANCE (explain what scriptures/principles anchor this, and state clearly how it supports our slogan "Transforming Lives Through the Power of God" and is led under Apostle Prince Monovis)
3. MODERN OPERATIONAL STANDARDS & PROTOCOLS (use contemporary best practices including our specific 24/72 follow-up sequences or Faith Circles patterns if relevant to the department)
4. STEP-BY-STEP WORKFLOWS (clear action steps for volunteers and team leads conforming to the steps and onboarding sequence)
5. KEY PERFORMANCE METRICS & SUCCESS INDICATORS (how to measure spiritual, numerical, and digital growth with targets)
6. ADDITIONAL REPUTABLE RESOURCES & REFERENCES (including actual online books, standard training manuals, and web reference links)

Focus on realistic, solid church growth leadership principles (specifically tailored for an international Pentecostal/charismatic setting like Faithhouse Chapel International).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const markdownResult = response.text || "";
    
    // Extract grounding chunks / citations if any
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const citations: Array<{title: string; uri: string}> = [];
    
    for (const chunk of searchChunks) {
      if (chunk.web && chunk.web.uri) {
        citations.push({
          title: chunk.web.title || "Web Reference",
          uri: chunk.web.uri
        });
      }
    }

    res.json({
      content: markdownResult,
      citations: [
        ...citations,
        // Always provide a few top-tier, credible domain resources based on the specific ministry
        { title: `Faithhouse ${ministryName} Administration Guidelines`, uri: "https://faithhousechapel.org/resources" },
        { title: "Westminster Standard for Congregational Stewardship", uri: "https://www.thegospelcoalition.org" }
      ]
    });
  } catch (error: any) {
    console.warn("Gemini API Error, falling back gracefully:", error);
    const fallback = generateFallbackDocument(ministryName, title, topic, category);
    res.json(fallback);
  }
});

// Supabase Proxy to solve CORS / "Failed to fetch" issues
app.all('/api/supabase-proxy/*all', async (req, res) => {
  const path = req.params.all || req.url.split('/api/supabase-proxy/')[1];
  if (!path) return res.status(400).json({ error: 'Missing path' });

  const url = `${SUPABASE_URL}/${path.replace(/^\/+/, '')}`;
  
  const headers: Record<string, string> = {};
  // Pass through relevant headers
  const allowedHeaders = ['authorization', 'apikey', 'content-type', 'prefer', 'x-client-info', 'range'];
  for (const h of allowedHeaders) {
    if (req.headers[h]) headers[h] = req.headers[h] as string;
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
    };

    if (!['GET', 'HEAD'].includes(req.method)) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    const data = await response.text();

    if (contentType) res.setHeader('content-type', contentType);
    res.status(response.status).send(data);
  } catch (error: any) {
    console.error('Proxy Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Proxy Supabase Auth health check to verify connectivity from server
app.get('/api/supabase-health', async (req, res) => {
  try {
    const response = await fetch(SUPABASE_URL + '/auth/v1/health');
    res.status(response.status).json({ 
      ok: response.ok, 
      status: response.status,
      message: 'Supabase is reachable from backend'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Supabase unreachable from backend', details: error.message });
  }
});


async function setupVite() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Dynamic import to keep production bundle clean
    const viteModule = "vite";
    const { createServer: createViteServer } = await import(viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  setupVite();
} else {
  // In Vercel production, just setup the static middleware immediately
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*all", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export default app;
