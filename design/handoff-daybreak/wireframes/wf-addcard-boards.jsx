// Add-a-Card composed wireframe boards. Uses atoms from wf-addcard.jsx.

// ============ TYPE A WORD ============
function AddTypeEmpty() {
  return <WTypeScreen variant="empty" screenLabel="Add a Card — Type, empty" notes={[
    'one destination, two modes \u2014 segmented toggle up top (Type a word / From an image)',
    'languages + deck shown as a context line so it is never ambiguous which way it saves',
    'two linked fields: type either side, the other auto-fills',
    'Save stays disabled (ghost) until both sides have content',
    'optimised for adding several in a row \u2014 form is short and stays put',
  ]} />;
}
function AddTypeTranslating() {
  return <WTypeScreen variant="translating" screenLabel="Add a Card — Type, translating" notes={[
    'typed in English, paused \u2014 Spanish side shows a pending shimmer + \u201Ctranslating\u2026\u201D',
    'pending treatment so the empty field never looks merely blank',
    'either field can be the one you type into \u2014 auto-translate is convenience, not a lock',
  ]} />;
}
function AddTypeErrors() {
  return <WTypeScreen variant="errors" screenLabel="Add a Card — Type, recoverable errors" notes={[
    'two soft, recoverable states shown together',
    'translate failed: receiving field invites manual entry \u2014 not a hard error',
    'save failed: banner with Try again; the typed words are preserved',
    'both sides filled here, so Save is enabled',
  ]} />;
}
function AddTypeSaved() {
  return <WTypeScreen variant="saved" screenLabel="Add a Card — Type, saved" notes={[
    'after save: brief \u201CCard saved\u201D confirm, form clears, ready for the next card',
    'keeps the add-several-in-a-row rhythm fast',
  ]} />;
}

// ============ IMAGE — STEP A: PICK ============
function AddPick() {
  return <WPickScreen state="idle" screenLabel="Add a Card — Image, pick" notes={[
    'same screen, Image tab active \u2014 the toggle still lets you switch back to Type',
    'one drop zone communicates all three inputs: browse, drag-and-drop, paste',
    'accepted types stated up front (JPG / PNG / WebP)',
    'stepper appears once you have an image and move into the flow',
  ]} />;
}
function AddPickOver() {
  return <WPickScreen state="over" screenLabel="Add a Card — Image, drag-over + validation" notes={[
    'drag-over: target reacts (fills, border tightens, copy \u2192 \u201CDrop to upload\u201D)',
    'validation error shows inline beneath \u2014 wrong type or too large, recoverable',
  ]} />;
}

// ============ IMAGE — STEP B: CONFIRM + DECK ============
function AddConfirm() {
  return (
    <Board screenLabel="Add a Card — Image, confirm + deck" notes={[
      'stepper starts here \u2014 stage 1 of 5 (Image)',
      'preview thumbnail + Remove / Change image',
      'deck selector confirms the destination (= target language); defaults to active deck, can change or create new',
      'Extract words kicks off processing',
    ]}>
      <Phone>
        <WFlowTop current={0} onBack="&lsaquo; Re-pick" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px 18px', gap: 16, minHeight: 0 }}>
          <WThumb size="lg" />
          <div style={{ display: 'flex', gap: 10 }}>
            <SBtn label="Remove" kind="ghost" i={2} style={{ flex: 1, height: 38, fontSize: 14 }} />
            <SBtn label="Change image" kind="ghost" i={1} style={{ flex: 1, height: 38, fontSize: 14 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14 }}>Add words to</span>
            <SBox i={3} style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
              <span style={{ fontSize: 16 }}>Spanish deck</span>
              <span style={{ fontSize: 13 }}>&#9662;</span>
            </SBox>
            <span style={{ fontSize: 12.5, color: FAINT }}>Defaults to your active deck &middot; change it or create a new one</span>
          </div>
          <div style={{ flex: 1 }}></div>
          <SBtn label="Extract words" kind="primary" i={1} style={{ height: 52, fontSize: 18 }} />
        </div>
      </Phone>
    </Board>
  );
}

// ============ IMAGE — STEP C: EXTRACTING ============
function AddExtracting() {
  return (
    <Board screenLabel="Add a Card — Image, extracting" notes={[
      'stage 2 (Extract) \u2014 the ~30s AI vision call',
      'calm, honest progress with on-brand copy \u2014 never a frozen-looking spinner',
      'tells the truth about the wait (\u201Cup to 30 seconds\u201D); interrupting controls are disabled',
      'Cancel still escapes safely',
    ]}>
      <Phone>
        <WFlowTop current={1} />
        <WProgress lion title="Reading your image\u2026" sub={<span>This can take up to 30 seconds.<br></br>Hang tight \u2014 your lion is sniffing out the words.</span>} />
        <div style={{ padding: '0 20px 20px', flex: 'none' }}>
          <SBtn label="Cancel" kind="ghost" i={2} style={{ height: 42, fontSize: 15 }} />
        </div>
      </Phone>
    </Board>
  );
}

function AddNoWords() {
  return (
    <Board screenLabel="Add a Card — Image, no words / error" notes={[
      'two non-happy outcomes from extraction',
      'no words found: friendly empty state, path back to pick another image',
      'error: specific recovery copy + Try again; image & deck preserved so retry is one tap',
      'reasons handled (copy differs): rate-limited, too large, unsupported, timed out, service down, expired session, network',
    ]}>
      <Phone>
        <WFlowTop current={1} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px 18px', gap: 16, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
            <LionMark size={64} label="hmm" />
            <span style={{ fontSize: 18 }}>No words found in this image.</span>
            <span style={{ fontSize: 14, color: FAINT, lineHeight: 1.4 }}>Try a photo with clearer text, or choose a different image.</span>
            <SBtn label="Choose another image" kind="primary" i={1} style={{ height: 46, fontSize: 16, padding: '0 18px' }} />
          </div>
          <SBox i={3} style={{ borderColor: RED, background: 'rgba(217,106,82,0.07)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 13, color: RED }}>&mdash; or, on failure &mdash;</span>
            <span style={{ fontSize: 14 }}>Reading took too long. Your image is still here.</span>
            <SBtn label="Try again" kind="ghost" i={2} style={{ height: 38, fontSize: 14, borderColor: RED }} />
          </SBox>
        </div>
      </Phone>
    </Board>
  );
}

// ============ IMAGE — STEP D: REVIEW WORDS ============
function AddReview() {
  const words = ['la monta\u00f1a', 'el r\u00edo', 'el bosque', 'la nube', 'sxsx???'];
  return (
    <Board screenLabel="Add a Card — Image, review words" notes={[
      'stage 3 (Review) \u2014 curate before anything is saved',
      'each word: keep/exclude (checkbox), edit (fix OCR), or remove (\u00d7)',
      'excluded rows stay visible but struck-through \u2014 you can change your mind',
      'select all / none bulk controls up top',
      '\u201CAlready learned\u201D listed separately as skipped, so it is clear why they are not added',
      'guard: keep at least one word to continue',
    ]}>
      <Phone>
        <WFlowTop current={2} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px 16px', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 'none' }}>
            <span style={{ fontSize: 16 }}>5 words found</span>
            <div style={{ display: 'flex', gap: 12 }}>
              <SLink>Select all</SLink>
              <SLink>None</SLink>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {words.map((w, i) => <WReviewRow key={i} word={w} excluded={i === 4} last={i === words.length - 1} />)}
          </div>
          <div style={{ flex: 'none' }}>
            <span style={{ fontSize: 12.5, color: FAINT }}>Already in your deck &middot; skipped</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 }}>
              {['el sol', 'la luna'].map((w) => (
                <span key={w} style={{ fontSize: 13, color: FAINT, border: `1.3px dashed ${FAINT}`, borderRadius: 8, padding: '3px 9px', textDecoration: 'line-through' }}>{w}</span>
              ))}
            </div>
          </div>
          <SBtn label="Translate 4 words &rsaquo;" kind="primary" i={1} style={{ height: 50, fontSize: 17 }} />
        </div>
      </Phone>
    </Board>
  );
}

// ============ IMAGE — STEP E: TRANSLATING + CHECK ============
function AddTranslating() {
  return (
    <Board screenLabel="Add a Card — Image, translating" notes={[
      'stage 4 (Translate) \u2014 kept words auto-translated in bulk',
      'honest progress: \u201CTranslating 4 words\u2026\u201D with the ability to cancel',
      'flows straight into the editable pair list when done',
    ]}>
      <Phone>
        <WFlowTop current={3} />
        <WProgress title="Translating 4 words\u2026" sub="Almost there. You will be able to check and fix each one." />
        <div style={{ padding: '0 20px 20px', flex: 'none' }}>
          <SBtn label="Cancel" kind="ghost" i={2} style={{ height: 42, fontSize: 15 }} />
        </div>
      </Phone>
    </Board>
  );
}

function AddCheck() {
  return (
    <Board screenLabel="Add a Card — Image, check translations" notes={[
      'review pairs \u2014 both native and target editable, fix any before committing',
      'per-row failure invites manual entry; one failure never blocks the rest',
      'Add N cards commits (count reflects what will be added); Back & Cancel available',
      'nothing is saved until this explicit commit',
    ]}>
      <Phone>
        <WFlowTop current={3} onBack="&lsaquo; Words" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px 16px', gap: 10, minHeight: 0 }}>
          <span style={{ fontSize: 16, flex: 'none' }}>Check translations</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <WPairRow target="la monta\u00f1a" native="the mountain" />
            <WPairRow target="el r\u00edo" native="the river" />
            <WPairRow target="el bosque" native="" failed />
            <WPairRow target="la nube" native="the cloud" last />
          </div>
          <SBtn label="Add 4 cards" kind="primary" i={1} style={{ height: 52, fontSize: 18, flex: 'none' }} />
        </div>
      </Phone>
    </Board>
  );
}

// ============ IMAGE — STEP F: RESULT ============
function AddResultSuccess() {
  return (
    <Board screenLabel="Add a Card — Image, result (success)" notes={[
      'stage 5 (Add) \u2014 committing state first (\u201CAdding 4 cards\u2026\u201D), then this summary',
      'all succeeded: celebrate the count, clear exit back to the deck',
    ]}>
      <Phone>
        <WFlowTop current={4} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <div style={{ position: 'relative' }}>
            <LionMark size={92} />
            <span style={{ position: 'absolute', right: -4, top: -6, fontSize: 20 }}>&#10024;</span>
          </div>
          <span style={{ fontSize: 24 }}>4 cards added!</span>
          <span style={{ fontSize: 14, color: FAINT }}>They are in your Spanish deck, ready to study.</span>
          <SBtn label="Go to my deck" kind="primary" i={1} style={{ height: 50, fontSize: 17, padding: '0 24px' }} />
        </div>
      </Phone>
    </Board>
  );
}

function AddResultPartial() {
  return (
    <Board screenLabel="Add a Card — Image, result (partial / all-failed)" notes={[
      'partial: report counts \u2014 N added, N already learned (skipped), N failed',
      'all-failed variant shown below: honest message + Back to deck, work preserved',
    ]}>
      <Phone>
        <WFlowTop current={4} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 20px', gap: 16, justifyContent: 'center' }}>
          <SBox i={0} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 20 }}>Added with a few skips</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span style={{ color: GREEN }}>&#10003; Added</span><span>3</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: FAINT }}><span>&#8211; Already learned</span><span>2</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: RED }}><span>! Couldn&rsquo;t add</span><span>1</span></div>
            </div>
            <SBtn label="Go to my deck" kind="primary" i={1} style={{ height: 46, fontSize: 16, alignSelf: 'stretch' }} />
          </SBox>
          <SBox i={3} style={{ borderColor: RED, background: 'rgba(217,106,82,0.07)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 13, color: RED }}>&mdash; all-failed variant &mdash;</span>
            <span style={{ fontSize: 16 }}>Couldn&rsquo;t add cards &mdash; please try again.</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <SBtn label="Try again" kind="ghost" i={2} style={{ height: 38, fontSize: 14, padding: '0 16px' }} />
              <SBtn label="Back to deck" kind="ghost" i={1} style={{ height: 38, fontSize: 14, padding: '0 16px' }} />
            </div>
          </SBox>
        </div>
      </Phone>
    </Board>
  );
}

Object.assign(window, {
  AddTypeEmpty, AddTypeTranslating, AddTypeErrors, AddTypeSaved,
  AddPick, AddPickOver, AddConfirm, AddExtracting, AddNoWords,
  AddReview, AddTranslating, AddCheck, AddResultSuccess, AddResultPartial,
});
