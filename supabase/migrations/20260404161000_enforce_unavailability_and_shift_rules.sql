CREATE OR REPLACE FUNCTION public.enforce_unavailability_next_week_cutoff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	_user_id UUID := auth.uid();
	_now_local TIMESTAMP := timezone('Australia/Brisbane', now());
	_today DATE := _now_local::date;
	_max_submission_date DATE := _today + 56;
	_submitted_week_start DATE := date_trunc('week', NEW.start_date::timestamp)::date;
	_cutoff_friday_6pm TIMESTAMP := (_submitted_week_start - 3)::timestamp + time '18:00';
BEGIN
	-- Admins can still manage unavailability records after the cutoff.
	IF public.has_role(_user_id, 'admin') THEN
		RETURN NEW;
	END IF;

	IF NEW.start_date < _today THEN
		RAISE EXCEPTION USING
			ERRCODE = 'P0001',
			MESSAGE = 'Cannot submit unavailability for past dates.';
	END IF;

	IF NEW.end_date > _max_submission_date THEN
		RAISE EXCEPTION USING
			ERRCODE = 'P0001',
			MESSAGE = 'Unavailability can only be submitted up to 8 weeks ahead.';
	END IF;

	IF _now_local >= _cutoff_friday_6pm THEN
		RAISE EXCEPTION USING
			ERRCODE = 'P0001',
			MESSAGE = 'Unavailability for this week closed on Friday at 6:00 PM. You can only submit for next week and beyond.';
	END IF;

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS unavailability_next_week_cutoff_guard ON public.unavailability;

CREATE TRIGGER unavailability_next_week_cutoff_guard
BEFORE INSERT OR UPDATE OF start_date, end_date ON public.unavailability
FOR EACH ROW
EXECUTE FUNCTION public.enforce_unavailability_next_week_cutoff();

