import type { Skill, SkillId } from './interface';
import { briefAnalyzeSkill } from './brief/analyze';
import { briefExtractRequirementsSkill } from './brief/extract-requirements';
import { scriptAdGenerateSkill } from './script/ad-generate';
import { scriptSocialCaptionSkill } from './script/social-caption';
import { scriptVoiceoverSkill } from './script/voiceover';
import { scriptSceneDescriptionSkill } from './script/scene-description';
import { hookVideoGenerateSkill } from './hook/video-hook';
import { hookThumbnailCopySkill } from './hook/thumbnail-copy';
import { strategyCampaignDevelopSkill } from './strategy/campaign-develop';
import { strategyBrandPositioningSkill } from './strategy/brand-positioning';
import { strategyAudienceSegmentationSkill } from './strategy/audience-segmentation';
import { qcScriptReviewSkill } from './qc/script-review';
import { qcBrandAlignmentSkill } from './qc/brand-alignment';
import { qcAssetMetadataSkill } from './qc/asset-metadata';
import { qcCreativeQualitySkill } from './qc/creative-quality';
import { qcFacebookPolicyCheckSkill } from './qc/facebook-policy-check';
import { whatsappClassifySkill } from './communication/whatsapp-classify';
import { facebookPagePublishSkill } from './facebook/page-publish';
import { utilityPromptOptimizeSkill } from './utility/prompt-optimize';
import { utilityOutputFormatSkill } from './utility/output-format';
import { utilityBatchCoordinateSkill } from './utility/batch-coordinator';
import { salesLeadDiscoverSkill } from './sales/lead-discover';
import { salesLeadVerifySkill } from './sales/lead-verify';
import { salesLeadScoreSkill } from './sales/lead-score';
import { salesLeadQualifySkill } from './sales/lead-qualify';
import { salesOutreachDraftSkill } from './sales/outreach-draft';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SKILL_REGISTRY: Record<SkillId, Skill<any, any>> = {
  'brief.analyze': briefAnalyzeSkill,
  'brief.extract_requirements': briefExtractRequirementsSkill,
  'script.ad.generate': scriptAdGenerateSkill,
  'script.social_caption.generate': scriptSocialCaptionSkill,
  'script.voiceover.generate': scriptVoiceoverSkill,
  'script.scene_description.generate': scriptSceneDescriptionSkill,
  'hook.video.generate': hookVideoGenerateSkill,
  'hook.thumbnail_copy.generate': hookThumbnailCopySkill,
  'strategy.campaign.develop': strategyCampaignDevelopSkill,
  'strategy.brand.positioning': strategyBrandPositioningSkill,
  'strategy.audience.segmentation': strategyAudienceSegmentationSkill,
  'qc.script.review': qcScriptReviewSkill,
  'qc.brand.alignment': qcBrandAlignmentSkill,
  'qc.asset.metadata': qcAssetMetadataSkill,
  'qc.creative.quality': qcCreativeQualitySkill,
  'qc.facebook_policy.check': qcFacebookPolicyCheckSkill,
  'communication.whatsapp.classify': whatsappClassifySkill,
  'facebook.page.publish': facebookPagePublishSkill,
  'utility.prompt.optimize': utilityPromptOptimizeSkill,
  'utility.output.format': utilityOutputFormatSkill,
  'utility.batch.coordinate': utilityBatchCoordinateSkill,
  'sales.lead.discover': salesLeadDiscoverSkill,
  'sales.lead.verify': salesLeadVerifySkill,
  'sales.lead.score': salesLeadScoreSkill,
  'sales.lead.qualify': salesLeadQualifySkill,
  'sales.outreach.draft': salesOutreachDraftSkill,
};
